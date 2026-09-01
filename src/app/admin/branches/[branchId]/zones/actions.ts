'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type ZoneResult = { ok: true } | { ok: false; error: string };

const MAX_NAME = 80;

async function requireZoneAdmin() {
  const me = await getMe();
  if (!ADMIN_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_admin' as const };
  }
  if (me.church.organization_type !== 'ministry') {
    return { me: null, error: 'not_a_ministry' as const };
  }
  return { me, error: null };
}

// A zone has no church_id of its own — it inherits tenancy from its
// branch. Every write therefore has to prove the branch belongs to the
// caller's church before touching the zone.
async function branchInOrg(branchId: string, churchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('branches')
    .select('id, name, church_id')
    .eq('id', branchId)
    .maybeSingle();
  if (!data || data.church_id !== churchId) return null;
  return data;
}

// Same cross-tenant guard branches uses: RLS scopes the zone row, not the
// user it points at, so a coordinator from another org has to be rejected
// here.
async function coordinatorInOrg(
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

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'name_required';
  if (trimmed.length > MAX_NAME) return 'name_too_long';
  return null;
}

export async function createZone(input: {
  branchId: string;
  name: string;
  coordinatorUserId: string | null;
}): Promise<ZoneResult> {
  const { me, error } = await requireZoneAdmin();
  if (!me) return { ok: false, error };

  const invalid = validateName(input.name);
  if (invalid) return { ok: false, error: invalid };

  const branch = await branchInOrg(input.branchId, me.church.id);
  if (!branch) return { ok: false, error: 'branch_not_found' };
  if (!(await coordinatorInOrg(input.coordinatorUserId, me.church.id))) {
    return { ok: false, error: 'invalid_coordinator' };
  }

  const supabase = await createClient();
  const { data, error: insErr } = await supabase
    .from('zones')
    .insert({
      branch_id: input.branchId,
      name: input.name.trim(),
      coordinator_user_id: input.coordinatorUserId,
      created_by: me.user.id,
    })
    .select('id, name')
    .single();
  if (insErr || !data) return { ok: false, error: insErr?.message ?? 'insert_failed' };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'zone',
    entityId: data.id,
    afterValue: {
      name: data.name,
      branch_id: input.branchId,
      branch_name: branch.name,
      coordinator_user_id: input.coordinatorUserId,
    },
  });

  revalidatePath(`/admin/branches/${input.branchId}/zones`);
  revalidatePath('/admin/branches');
  revalidatePath('/admin');
  return { ok: true };
}

export async function updateZone(input: {
  id: string;
  name: string;
  coordinatorUserId: string | null;
}): Promise<ZoneResult> {
  const { me, error } = await requireZoneAdmin();
  if (!me) return { ok: false, error };

  const invalid = validateName(input.name);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('zones')
    .select('*')
    .eq('id', input.id)
    .maybeSingle();
  if (!before) return { ok: false, error: 'not_found' };

  const branch = await branchInOrg(before.branch_id, me.church.id);
  if (!branch) return { ok: false, error: 'not_found' };
  if (!(await coordinatorInOrg(input.coordinatorUserId, me.church.id))) {
    return { ok: false, error: 'invalid_coordinator' };
  }

  const { error: upErr } = await supabase
    .from('zones')
    .update({
      name: input.name.trim(),
      coordinator_user_id: input.coordinatorUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'zone',
    entityId: input.id,
    beforeValue: {
      name: before.name,
      coordinator_user_id: before.coordinator_user_id,
    },
    afterValue: {
      name: input.name.trim(),
      coordinator_user_id: input.coordinatorUserId,
    },
  });

  revalidatePath(`/admin/branches/${before.branch_id}/zones`);
  revalidatePath('/admin/branches');
  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteZone(id: string): Promise<ZoneResult> {
  const { me, error } = await requireZoneAdmin();
  if (!me) return { ok: false, error };

  // Owner-only, matching zones_delete. Checked here too so the UI gets a
  // named error rather than a zero-row delete that looks like success.
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('zones')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!before) return { ok: false, error: 'not_found' };

  const branch = await branchInOrg(before.branch_id, me.church.id);
  if (!branch) return { ok: false, error: 'not_found' };

  const { error: delErr } = await supabase.from('zones').delete().eq('id', id);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'zone',
    entityId: id,
    beforeValue: { name: before.name, branch_id: before.branch_id },
    afterValue: { deleted: true },
  });

  revalidatePath(`/admin/branches/${before.branch_id}/zones`);
  revalidatePath('/admin/branches');
  revalidatePath('/admin');
  return { ok: true };
}
