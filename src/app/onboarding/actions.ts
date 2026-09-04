'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import type { AppLanguage, OrganizationType } from '@/lib/types';
import { isCountryCode } from '@/lib/countries';

export type StepResult = { ok: true } | { ok: false; error: string };

// Only owners run the onboarding wizard; invited admins/leaders skip
// straight to their role home. Every action gates on this so a
// non-owner forging a fetch is refused with 'not_owner'.
async function requireOwner() {
  const me = await getMe();
  if (!OWNER_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_owner' as const };
  }
  return { me, error: null };
}

async function markProgress(
  userId: string,
  patch: Partial<{
    org_type_selected_at: string;
    church_profile_completed_at: string;
    admins_invited_at: string;
    admins_skipped_at: string;
    departments_created_at: string;
    departments_skipped_at: string;
    pom_assigned_at: string;
    pom_skipped_at: string;
    completed_at: string;
  }>,
) {
  const supabase = await createClient();
  await supabase
    .from('user_onboarding_progress')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

// ─────────────────────────────────────────────────────────────
// Step 0 — church vs ministry (required, cannot be skipped)
// ─────────────────────────────────────────────────────────────

// Writes the tenant's organization_type and stamps the progress row so
// the decision page is never shown twice. Everything downstream — Step 3
// vocabulary, whether Step 4 exists, which dashboard cards appear —
// reads churches.organization_type, so this is the only place it is set
// during onboarding.
export async function selectOrgType(
  orgType: OrganizationType,
): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  if (orgType !== 'church' && orgType !== 'ministry') {
    return { ok: false, error: 'invalid_org_type' };
  }

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('churches')
    .update({ organization_type: orgType })
    .eq('id', me.church.id);
  if (upErr) return { ok: false, error: upErr.message };

  await markProgress(me.user.id, {
    org_type_selected_at: new Date().toISOString(),
  });

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'church',
    entityId: me.church.id,
    beforeValue: { organization_type: me.church.organization_type },
    afterValue: { organization_type: orgType, via: 'onboarding_step_0' },
  });

  revalidatePath('/onboarding');
  return { ok: true };
}

// Undoes Step 0 so the owner can pick again. Clears every step stamp on
// the progress row, which sends /onboarding back to the decision page and
// restarts the wizard from step 1.
//
// organization_type is deliberately left alone. The column is NOT NULL
// with a 'church' default, so the spec's `set organization_type = null`
// cannot run — and making it nullable would be worse: four read sites
// (dashboard, step 3, step 4 guard, sidebar) would each need a meaning
// for "no type", which does not exist. org_type_selected_at is already
// the source of truth for "has the owner chosen", and nothing reads
// organization_type while it is null, because the only reachable page in
// that state is Step 0. The next choice overwrites it.
//
// Church profile data — name, country, city, logo — is untouched.
export async function resetOrgType(): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  // Re-running the wizard after completion is a settings concern, not a
  // wizard one; the layout would bounce them to /dashboard anyway.
  if (me.user.onboarding_completed_at) {
    return { ok: false, error: 'already_completed' };
  }

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('user_onboarding_progress')
    .update({
      org_type_selected_at: null,
      church_profile_completed_at: null,
      admins_invited_at: null,
      admins_skipped_at: null,
      departments_created_at: null,
      departments_skipped_at: null,
      pom_assigned_at: null,
      pom_skipped_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', me.user.id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'reset_org_type',
    entityType: 'church',
    entityId: me.church.id,
    beforeValue: { organization_type: me.church.organization_type },
    afterValue: { progress_reset: true, via: 'onboarding_wizard' },
  });

  revalidatePath('/onboarding');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Step 1 — church profile (required)
// ─────────────────────────────────────────────────────────────

export async function saveChurchProfile(input: {
  name: string;
  country: string;
  language: AppLanguage;
  logoUrl: string | null;
}): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'name_required' };
  if (name.length > 100) return { ok: false, error: 'name_too_long' };
  if (!isCountryCode(input.country)) return { ok: false, error: 'invalid_country' };
  if (input.language !== 'en' && input.language !== 'fr') {
    return { ok: false, error: 'invalid_language' };
  }

  const supabase = await createClient();
  const patch: Record<string, string | null> = {
    name,
    country: input.country,
    language: input.language,
  };
  if (input.logoUrl !== null) patch.logo_url = input.logoUrl;

  const { error: upErr } = await supabase
    .from('churches')
    .update(patch)
    .eq('id', me.church.id);
  if (upErr) return { ok: false, error: upErr.message };

  // Also mirror the language to the owner's own preferred_language so
  // the sidebar + emails follow the same language they picked here.
  await supabase
    .from('users')
    .update({ preferred_language: input.language })
    .eq('id', me.user.id);

  await markProgress(me.user.id, {
    church_profile_completed_at: new Date().toISOString(),
  });

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'church',
    entityId: me.church.id,
    afterValue: { name, country: input.country, language: input.language },
  });

  revalidatePath('/onboarding');
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Step 2 — invite admin pastors (skippable)
// ─────────────────────────────────────────────────────────────

export type InviteRow = { name: string; email: string };
export type Step2Result =
  | { ok: true; invited: number; failures: Array<{ email: string; reason: string }> }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteAdminsStep(rows: InviteRow[]): Promise<Step2Result> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };
  if (!hasAdminKey()) return { ok: false, error: 'missing_service_key' };

  // Filter out empty rows the user left blank.
  const filled = rows
    .map((r) => ({ name: r.name.trim(), email: r.email.trim().toLowerCase() }))
    .filter((r) => r.name || r.email);
  if (filled.length === 0) {
    // Nothing to do — treat as a skip, not an error.
    await markProgress(me.user.id, {
      admins_skipped_at: new Date().toISOString(),
    });
    return { ok: true, invited: 0, failures: [] };
  }

  const admin = createAdminClient();
  const rawBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'https://app.equip2lead.coach';
  const baseUrl = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`;
  const redirectTo = `${baseUrl.replace(/\/$/, '')}/auth/accept-invite`;

  const failures: Array<{ email: string; reason: string }> = [];
  let invited = 0;

  for (const row of filled) {
    if (!EMAIL_RE.test(row.email)) {
      failures.push({ email: row.email || '(blank)', reason: 'invalid_email' });
      continue;
    }
    if (!row.name) {
      failures.push({ email: row.email, reason: 'name_required' });
      continue;
    }

    const { data: inviteData, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(row.email, {
        redirectTo,
        data: { full_name: row.name },
      });
    if (inviteErr || !inviteData?.user) {
      failures.push({ email: row.email, reason: inviteErr?.message ?? 'invite_failed' });
      continue;
    }

    // app_metadata is Admin-API only, so we can trust it in
    // bootstrap_my_church when the invited user claims their account.
    const { error: metaErr } = await admin.auth.admin.updateUserById(inviteData.user.id, {
      app_metadata: {
        inviting_church_id: me.church.id,
        invited_role: 'admin_pastor',
        invited_full_name: row.name,
        invited_by: me.user.id,
      },
    });
    if (metaErr) {
      failures.push({ email: row.email, reason: metaErr.message });
      continue;
    }

    await logAudit({
      churchId: me.church.id,
      userId: me.user.id,
      action: 'invite',
      entityType: 'user',
      entityId: inviteData.user.id,
      afterValue: {
        email: row.email,
        full_name: row.name,
        role: 'admin_pastor',
        via: 'onboarding_wizard',
      },
    });
    invited++;
  }

  await markProgress(me.user.id, {
    admins_invited_at: new Date().toISOString(),
  });
  revalidatePath('/admin/users');
  return { ok: true, invited, failures };
}

export async function skipAdminsStep(): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };
  await markProgress(me.user.id, {
    admins_skipped_at: new Date().toISOString(),
  });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Step 3 — create departments (skippable)
// ─────────────────────────────────────────────────────────────

export type Step3Result =
  | { ok: true; created: number }
  | { ok: false; error: string };

export async function createDepartmentsStep(names: string[]): Promise<Step3Result> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  const cleaned = Array.from(
    new Set(
      names
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && n.length <= 60),
    ),
  );

  if (cleaned.length === 0) {
    // Treat as skip.
    await markProgress(me.user.id, {
      departments_skipped_at: new Date().toISOString(),
    });
    return { ok: true, created: 0 };
  }

  const supabase = await createClient();
  const rows = cleaned.map((name, i) => ({
    church_id: me.church.id,
    name,
    is_active: true,
    display_order: i,
  }));

  const { data, error: insErr } = await supabase
    .from('departments')
    .insert(rows)
    .select('id, name');
  if (insErr) return { ok: false, error: insErr.message };

  for (const d of data ?? []) {
    await logAudit({
      churchId: me.church.id,
      userId: me.user.id,
      action: 'create',
      entityType: 'department',
      entityId: d.id,
      afterValue: { name: d.name, via: 'onboarding_wizard' },
    });
  }

  await markProgress(me.user.id, {
    departments_created_at: new Date().toISOString(),
  });
  revalidatePath('/admin/departments');
  return { ok: true, created: data?.length ?? 0 };
}

// Ministries have no step 4, so step 3 is their last. Closing the wizard
// here writes the same rows a church would get from skipping step 4 —
// pom_skipped_at plus the two completion stamps — so a ministry and a
// church that skipped PoM are indistinguishable to everything downstream.
export async function finishMinistryWizard(): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };
  if (me.church.organization_type !== 'ministry') {
    return { ok: false, error: 'not_ministry' };
  }
  await markProgress(me.user.id, {
    pom_skipped_at: new Date().toISOString(),
  });
  await finishWizard(me.user.id, me.church.id);
  return { ok: true };
}

export async function skipDepartmentsStep(): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };
  await markProgress(me.user.id, {
    departments_skipped_at: new Date().toISOString(),
  });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Step 4 — assign Pastor of the Month (skippable, closes wizard)
// ─────────────────────────────────────────────────────────────

async function finishWizard(userId: string, churchId: string) {
  const now = new Date().toISOString();
  await markProgress(userId, { completed_at: now });
  const supabase = await createClient();
  await supabase
    .from('users')
    .update({ onboarding_completed_at: now })
    .eq('id', userId);
  await logAudit({
    churchId,
    userId,
    action: 'update',
    entityType: 'user',
    entityId: userId,
    afterValue: { onboarding_completed: true },
  });
}

export async function assignPomStep(input: {
  pastorUserId: string;
  monthYYYYMM: string;
}): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(input.monthYYYYMM);
  if (!monthMatch) return { ok: false, error: 'invalid_month' };
  const assignmentMonth = `${monthMatch[1]}-${monthMatch[2]}-01`;

  const supabase = await createClient();

  // Verify target user is in the same church + is a valid pastor.
  const { data: target } = await supabase
    .from('users')
    .select('id, church_id, role')
    .eq('id', input.pastorUserId)
    .maybeSingle();
  if (!target || target.church_id !== me.church.id) {
    return { ok: false, error: 'invalid_pastor' };
  }
  // Owner assigning themselves is allowed (per spec — "Yourself").
  // Otherwise the target must be an admin_pastor / legacy pastor.
  const isSelf = target.id === me.user.id;
  const isAdminPastor =
    target.role === 'admin_pastor' || target.role === 'pastor';
  if (!isSelf && !isAdminPastor) {
    return { ok: false, error: 'ineligible_pastor' };
  }

  // If an active assignment already exists for this church, this insert
  // will hit the unique partial index. Return a friendly error rather
  // than the raw pg error.
  const { data: existingActive } = await supabase
    .from('pastor_assignments')
    .select('id')
    .eq('church_id', me.church.id)
    .eq('status', 'active')
    .maybeSingle();
  if (existingActive) {
    // Someone already active — silently close the wizard without
    // duplicating. The dashboard will show the existing assignment.
    await markProgress(me.user.id, {
      pom_assigned_at: new Date().toISOString(),
    });
    await finishWizard(me.user.id, me.church.id);
    return { ok: true };
  }

  const { data: inserted, error: insErr } = await supabase
    .from('pastor_assignments')
    .insert({
      church_id: me.church.id,
      pastor_user_id: input.pastorUserId,
      assignment_month: assignmentMonth,
      status: 'active',
    })
    .select('id')
    .single();
  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? 'insert_failed' };
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'pastor_assignment',
    entityId: inserted.id,
    afterValue: {
      pastor_user_id: input.pastorUserId,
      assignment_month: assignmentMonth,
      status: 'active',
      via: 'onboarding_wizard',
    },
  });

  await markProgress(me.user.id, {
    pom_assigned_at: new Date().toISOString(),
  });
  await finishWizard(me.user.id, me.church.id);
  revalidatePath('/admin/assignments');
  return { ok: true };
}

export async function skipPomStep(): Promise<StepResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };
  await markProgress(me.user.id, {
    pom_skipped_at: new Date().toISOString(),
  });
  await finishWizard(me.user.id, me.church.id);
  return { ok: true };
}

// Redirects — server actions the client can call to move on after
// state update. Keeping navigation on the server keeps the wizard
// safe from stale-cache back-navigation.
export async function goToStep(step: 1 | 2 | 3 | 4) {
  redirect(`/onboarding/step-${step}`);
}

export async function goToDashboard() {
  redirect('/dashboard');
}
