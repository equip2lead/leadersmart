'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { DEPARTMENT_ICONS } from '@/lib/icons';

export type ActionResult = { ok: true } | { ok: false; error: string };

function cleanIcon(icon: string | null): string | null {
  if (!icon) return null;
  return icon in DEPARTMENT_ICONS ? icon : null;
}

// Reads a "__none__" sentinel or empty as null, otherwise trims and returns
// the raw form value. Used for the head + two co-head dropdowns.
function readLeader(formData: FormData, field: string): string | null {
  const raw = String(formData.get(field) ?? '').trim();
  return raw && raw !== '__none__' ? raw : null;
}

// Ensures head + co-heads are three distinct people. Returns the first
// duplicated pair as the error, or null when they are all unique.
function detectDuplicateAssignments(
  head: string | null,
  co1: string | null,
  co2: string | null,
): string | null {
  const assigned = [head, co1, co2].filter((v): v is string => !!v);
  const unique = new Set(assigned);
  if (unique.size !== assigned.length) return 'duplicate_assignments';
  return null;
}

export async function createDepartment(formData: FormData): Promise<ActionResult> {
  const { user, church } = await requireRole(ADMIN_ROLES);
  const supabase = await createClient();

  const name = String(formData.get('name') ?? '').trim();
  const icon = cleanIcon(String(formData.get('icon') ?? '').trim() || null);
  const description = String(formData.get('description') ?? '').trim() || null;
  const leader_user_id = readLeader(formData, 'leader_user_id');
  const co_leader_1_user_id = readLeader(formData, 'co_leader_1_user_id');
  const co_leader_2_user_id = readLeader(formData, 'co_leader_2_user_id');

  if (!name) return { ok: false, error: 'name_required' };
  const dup = detectDuplicateAssignments(
    leader_user_id,
    co_leader_1_user_id,
    co_leader_2_user_id,
  );
  if (dup) return { ok: false, error: dup };

  const { data, error } = await supabase
    .from('departments')
    .insert({
      church_id: church.id,
      name,
      icon,
      description,
      leader_user_id,
      co_leader_1_user_id,
      co_leader_2_user_id,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'create',
    entityType: 'department',
    entityId: data.id,
    afterValue: {
      name,
      icon,
      description,
      leader_user_id,
      co_leader_1_user_id,
      co_leader_2_user_id,
      is_active: true,
    },
  });

  // Clears the "you skipped this in onboarding" nudge on /admin.
  await supabase
    .from('user_onboarding_progress')
    .update({ departments_skipped_at: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  revalidatePath('/admin/departments');
  revalidatePath('/admin');
  return { ok: true };
}

export async function updateDepartment(
  departmentId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user, church } = await requireRole(ADMIN_ROLES);
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('departments')
    .select(
      'id, name, icon, description, leader_user_id, co_leader_1_user_id, co_leader_2_user_id, is_active',
    )
    .eq('id', departmentId)
    .eq('church_id', church.id)
    .maybeSingle();

  if (!before) return { ok: false, error: 'not_found' };

  const name = String(formData.get('name') ?? '').trim();
  const icon = cleanIcon(String(formData.get('icon') ?? '').trim() || null);
  const description = String(formData.get('description') ?? '').trim() || null;
  const leader_user_id = readLeader(formData, 'leader_user_id');
  const co_leader_1_user_id = readLeader(formData, 'co_leader_1_user_id');
  const co_leader_2_user_id = readLeader(formData, 'co_leader_2_user_id');

  if (!name) return { ok: false, error: 'name_required' };
  const dup = detectDuplicateAssignments(
    leader_user_id,
    co_leader_1_user_id,
    co_leader_2_user_id,
  );
  if (dup) return { ok: false, error: dup };

  const patch = {
    name,
    icon,
    description,
    leader_user_id,
    co_leader_1_user_id,
    co_leader_2_user_id,
  };
  const { error } = await supabase
    .from('departments')
    .update(patch)
    .eq('id', departmentId)
    .eq('church_id', church.id);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'update',
    entityType: 'department',
    entityId: departmentId,
    beforeValue: before,
    afterValue: { ...before, ...patch },
  });

  revalidatePath('/admin/departments');
  revalidatePath('/admin');
  return { ok: true };
}

export async function setDepartmentActive(
  departmentId: string,
  active: boolean,
): Promise<ActionResult> {
  const { user, church } = await requireRole(ADMIN_ROLES);
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('departments')
    .select('id, is_active')
    .eq('id', departmentId)
    .eq('church_id', church.id)
    .maybeSingle();

  if (!before) return { ok: false, error: 'not_found' };
  if (before.is_active === active) return { ok: true };

  const { error } = await supabase
    .from('departments')
    .update({ is_active: active })
    .eq('id', departmentId)
    .eq('church_id', church.id);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: active ? 'reactivate' : 'deactivate',
    entityType: 'department',
    entityId: departmentId,
    beforeValue: { is_active: before.is_active },
    afterValue: { is_active: active },
  });

  revalidatePath('/admin/departments');
  revalidatePath('/admin');
  return { ok: true };
}
