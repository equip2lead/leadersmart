'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, OWNER_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import type { UserRole } from '@/lib/types';

export type InviteResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

// The new-model roles an owner or admin_pastor can *ever* mint via invite.
// 'owner' is deliberately excluded — becoming owner happens via the
// Phase 3 transfer flow, never via invitation.
type InvitableRole =
  | 'admin_pastor'
  | 'department_head'
  | 'fire_kids_coordinator';

const INVITABLE_ROLES: ReadonlyArray<InvitableRole> = [
  'admin_pastor',
  'department_head',
  'fire_kids_coordinator',
];

// Roles that can only be granted by the owner (per Section 17 decisions
// #3 and #5): admin_pastor and fire_kids_coordinator.
const OWNER_ONLY_ROLES: ReadonlyArray<InvitableRole> = [
  'admin_pastor',
  'fire_kids_coordinator',
];

function isInvitableRole(v: string): v is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(v);
}

export async function inviteUser(formData: FormData): Promise<InviteResult> {
  const { user: me, church } = await requireRole(ADMIN_ROLES);

  if (!hasAdminKey()) {
    return { ok: false, error: 'missing_service_key' };
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const roleRaw = String(formData.get('role') ?? '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }
  if (!fullName) return { ok: false, error: 'name_required' };
  if (!isInvitableRole(roleRaw)) return { ok: false, error: 'invalid_role' };
  const role = roleRaw;

  // Enforce owner-only grants server-side. Client hides these options
  // when the caller isn't an owner, but never trust the UI alone.
  if (
    (OWNER_ONLY_ROLES as readonly string[]).includes(role) &&
    !isOwner(me.role)
  ) {
    return { ok: false, error: 'owner_only_role' };
  }

  const admin = createAdminClient();

  const rawBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'https://leadersmart.app';
  const baseUrl = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`;
  const redirectTo = `${baseUrl.replace(/\/$/, '')}/auth/accept-invite`;

  // 1) Send the invitation email. `data` is written to user_metadata (visible client-side).
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      data: {
        full_name: fullName,
      },
    },
  );

  if (inviteErr || !inviteData?.user) {
    return { ok: false, error: inviteErr?.message ?? 'invite_failed' };
  }

  // 2) Write the church link + role to app_metadata (NOT user_metadata) so a
  //    malicious signup cannot spoof it. app_metadata is only writable via the
  //    Admin API. bootstrap_my_church reads this on account claim.
  const { error: metaErr } = await admin.auth.admin.updateUserById(inviteData.user.id, {
    app_metadata: {
      inviting_church_id: church.id,
      invited_role: role as UserRole,
      invited_full_name: fullName,
      invited_by: me.id,
    },
  });

  if (metaErr) {
    return { ok: false, error: metaErr.message };
  }

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'invite',
    entityType: 'user',
    entityId: inviteData.user.id,
    afterValue: { email, full_name: fullName, role },
  });

  revalidatePath('/admin/users');
  return { ok: true, email };
}

// ─────────────────────────────────────────────────────────────
// Role change + membership removal (Owner-only, per spec Section 17).
// ─────────────────────────────────────────────────────────────

export type RoleChangeResult = { ok: true } | { ok: false; error: string };

// Only these primary-role transitions are exposed via the UI in Phase 3.
// Owner assignments happen via the transfer flow, not a direct promote;
// admin_pastor and fire_kids_coordinator invites use the invite path.
const ALLOWED_ROLE_TRANSITIONS: ReadonlyArray<{
  from: UserRole;
  to: UserRole;
}> = [
  { from: 'admin_pastor', to: 'department_head' },
  { from: 'department_head', to: 'admin_pastor' },
  // Legacy fallbacks so a pre-migration user with role='pastor' or
  // 'department_leader' can still be promoted/demoted through this UI.
  { from: 'pastor', to: 'department_head' },
  { from: 'department_leader', to: 'admin_pastor' },
];

function isAllowedTransition(from: UserRole, to: UserRole): boolean {
  return ALLOWED_ROLE_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export async function changeUserRole(
  targetUserId: string,
  toRole: UserRole,
): Promise<RoleChangeResult> {
  const { user: me, church } = await requireRole(OWNER_ROLES);
  const supabase = await createClient();

  if (targetUserId === me.id) {
    return { ok: false, error: 'cannot_change_own_role' };
  }

  const { data: target } = await supabase
    .from('users')
    .select('id, church_id, role, is_active, full_name')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!target || target.church_id !== church.id) {
    return { ok: false, error: 'not_found' };
  }
  if (target.role === 'owner') {
    return { ok: false, error: 'cannot_change_owner' };
  }

  const fromRole = target.role as UserRole;
  if (!isAllowedTransition(fromRole, toRole)) {
    return { ok: false, error: 'invalid_transition' };
  }

  const { error } = await supabase
    .from('users')
    .update({ role: toRole })
    .eq('id', targetUserId);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'update',
    entityType: 'user',
    entityId: targetUserId,
    beforeValue: { role: fromRole },
    afterValue: { role: toRole },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { ok: true };
}

export async function removeUserFromChurch(
  targetUserId: string,
): Promise<RoleChangeResult> {
  const { user: me, church } = await requireRole(OWNER_ROLES);
  const supabase = await createClient();

  if (targetUserId === me.id) {
    return { ok: false, error: 'cannot_remove_self' };
  }

  const { data: target } = await supabase
    .from('users')
    .select('id, church_id, role, is_active, full_name')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!target || target.church_id !== church.id) {
    return { ok: false, error: 'not_found' };
  }
  if (target.role === 'owner') {
    return { ok: false, error: 'cannot_remove_owner' };
  }
  if (!target.is_active) return { ok: true };

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', targetUserId);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'deactivate',
    entityType: 'user',
    entityId: targetUserId,
    beforeValue: { is_active: true, role: target.role },
    afterValue: { is_active: false, role: target.role },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Secondary role grants (user_secondary_roles). Fire Kids Coordinator
// is the only one wired to a UI button in Phase 3 — owner-only per
// Section 17 decision #5.
// ─────────────────────────────────────────────────────────────

export async function grantFireKidsCoordinator(
  targetUserId: string,
): Promise<RoleChangeResult> {
  const { user: me, church } = await requireRole(OWNER_ROLES);
  const supabase = await createClient();

  const { data: target } = await supabase
    .from('users')
    .select('id, church_id')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!target || target.church_id !== church.id) {
    return { ok: false, error: 'not_found' };
  }

  const { error } = await supabase.from('user_secondary_roles').insert({
    user_id: targetUserId,
    church_id: church.id,
    role: 'fire_kids_coordinator',
    granted_by_user_id: me.id,
  });

  if (error) {
    if (error.code === '23505') return { ok: true }; // already granted — idempotent
    return { ok: false, error: error.message };
  }

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'create',
    entityType: 'user_secondary_role',
    entityId: targetUserId,
    afterValue: { role: 'fire_kids_coordinator' },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { ok: true };
}

export async function revokeFireKidsCoordinator(
  targetUserId: string,
): Promise<RoleChangeResult> {
  const { user: me, church } = await requireRole(OWNER_ROLES);
  const supabase = await createClient();

  const { data: target } = await supabase
    .from('users')
    .select('id, church_id')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!target || target.church_id !== church.id) {
    return { ok: false, error: 'not_found' };
  }

  const { error } = await supabase
    .from('user_secondary_roles')
    .delete()
    .eq('user_id', targetUserId)
    .eq('role', 'fire_kids_coordinator');

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'deactivate',
    entityType: 'user_secondary_role',
    entityId: targetUserId,
    beforeValue: { role: 'fire_kids_coordinator' },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { ok: true };
}

export async function reactivateUser(
  targetUserId: string,
): Promise<RoleChangeResult> {
  const { user: me, church } = await requireRole(OWNER_ROLES);
  const supabase = await createClient();

  const { data: target } = await supabase
    .from('users')
    .select('id, church_id, role, is_active')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!target || target.church_id !== church.id) {
    return { ok: false, error: 'not_found' };
  }
  if (target.is_active) return { ok: true };

  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', targetUserId);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'reactivate',
    entityType: 'user',
    entityId: targetUserId,
    beforeValue: { is_active: false },
    afterValue: { is_active: true },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { ok: true };
}
