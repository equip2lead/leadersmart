'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { isCountryCode } from '@/lib/countries';

export type BranchResult = { ok: true } | { ok: false; error: string };

const MAX_NAME = 80;
const MAX_CITY = 80;

// Postgres unique_violation. The only unique constraint on this table is
// branches_hq_uniq, so this always means "a second headquarters".
const PG_UNIQUE_VIOLATION = '23505';

// Branches exist for ministries only in 5a; churches have no branch
// concept yet. Gate on ADMIN_ROLES rather than a role literal so this
// agrees with roles.ts and with the RLS policies.
async function requireBranchAdmin() {
  const me = await getMe();
  if (!ADMIN_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_admin' as const };
  }
  if (me.church.organization_type !== 'ministry') {
    return { me: null, error: 'not_a_ministry' as const };
  }
  return { me, error: null };
}

type BranchInput = {
  name: string;
  countryCode: string;
  city: string;
  coordinatorUserId: string | null;
  isHeadquarters: boolean;
};

function validate(input: BranchInput): string | null {
  const name = input.name.trim();
  if (!name) return 'name_required';
  if (name.length > MAX_NAME) return 'name_too_long';
  if (!isCountryCode(input.countryCode)) return 'invalid_country';
  if (input.city.trim().length > MAX_CITY) return 'city_too_long';
  return null;
}

// A coordinator must be someone in the same org. RLS would not catch
// this — the policies scope the branch row, not the referenced user — so
// pointing at a user in another tenant has to be rejected here.
async function coordinatorIsInOrg(
  coordinatorUserId: string | null,
  churchId: string,
): Promise<boolean> {
  if (!coordinatorUserId) return true;
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, church_id')
    .eq('id', coordinatorUserId)
    .maybeSingle();
  return !!data && data.church_id === churchId;
}

export async function createBranch(input: BranchInput): Promise<BranchResult> {
  const { me, error } = await requireBranchAdmin();
  if (!me) return { ok: false, error };

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };
  if (!(await coordinatorIsInOrg(input.coordinatorUserId, me.church.id))) {
    return { ok: false, error: 'invalid_coordinator' };
  }

  const supabase = await createClient();
  const { data, error: insErr } = await supabase
    .from('branches')
    .insert({
      church_id: me.church.id,
      name: input.name.trim(),
      country_code: input.countryCode,
      city: input.city.trim() || null,
      coordinator_user_id: input.coordinatorUserId,
      is_headquarters: input.isHeadquarters,
      created_by: me.user.id,
    })
    .select('id, name, country_code, city, is_headquarters')
    .single();

  if (insErr) {
    return {
      ok: false,
      error: insErr.code === PG_UNIQUE_VIOLATION ? 'hq_conflict' : insErr.message,
    };
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'branch',
    entityId: data.id,
    afterValue: {
      name: data.name,
      country_code: data.country_code,
      city: data.city,
      is_headquarters: data.is_headquarters,
      coordinator_user_id: input.coordinatorUserId,
    },
  });

  revalidatePath('/admin/branches');
  return { ok: true };
}

export async function updateBranch(
  input: BranchInput & { id: string },
): Promise<BranchResult> {
  const { me, error } = await requireBranchAdmin();
  if (!me) return { ok: false, error };

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };
  if (!(await coordinatorIsInOrg(input.coordinatorUserId, me.church.id))) {
    return { ok: false, error: 'invalid_coordinator' };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('branches')
    .select('*')
    .eq('id', input.id)
    .maybeSingle();
  if (!before || before.church_id !== me.church.id) {
    return { ok: false, error: 'not_found' };
  }

  const { error: upErr } = await supabase
    .from('branches')
    .update({
      name: input.name.trim(),
      country_code: input.countryCode,
      city: input.city.trim() || null,
      coordinator_user_id: input.coordinatorUserId,
      is_headquarters: input.isHeadquarters,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (upErr) {
    return {
      ok: false,
      error: upErr.code === PG_UNIQUE_VIOLATION ? 'hq_conflict' : upErr.message,
    };
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'branch',
    entityId: input.id,
    beforeValue: {
      name: before.name,
      country_code: before.country_code,
      city: before.city,
      is_headquarters: before.is_headquarters,
      coordinator_user_id: before.coordinator_user_id,
    },
    afterValue: {
      name: input.name.trim(),
      country_code: input.countryCode,
      city: input.city.trim() || null,
      is_headquarters: input.isHeadquarters,
      coordinator_user_id: input.coordinatorUserId,
    },
  });

  revalidatePath('/admin/branches');
  return { ok: true };
}

export async function deleteBranch(id: string): Promise<BranchResult> {
  const { me, error } = await requireBranchAdmin();
  if (!me) return { ok: false, error };

  // Deleting is owner-only, matching branches_delete. Checked here as
  // well so the UI gets a named error instead of a zero-row delete that
  // silently looks like success.
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!before || before.church_id !== me.church.id) {
    return { ok: false, error: 'not_found' };
  }

  const { error: delErr } = await supabase.from('branches').delete().eq('id', id);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'branch',
    entityId: id,
    beforeValue: {
      name: before.name,
      country_code: before.country_code,
      is_headquarters: before.is_headquarters,
    },
    afterValue: { deleted: true },
  });

  revalidatePath('/admin/branches');
  return { ok: true };
}
