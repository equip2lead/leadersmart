'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
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
