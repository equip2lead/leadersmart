'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type ServiceResult = { ok: true } | { ok: false; error: string };

const MAX_NAME = 80;
const MAX_OFFSET = 480; // 8h — matches the CHECK constraint on the column.

// Gate on ADMIN_ROLES rather than a literal ('owner','admin_pastor') pair
// so this agrees with the RLS policies and with roles.ts. A role list that
// drifts from roles.ts is what produced the bootstrap_my_church bug.
async function requireAdmin() {
  const me = await getMe();
  if (!ADMIN_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_admin' as const };
  }
  // Ministries do not run a weekly service schedule; the page is hidden
  // for them, and the action refuses too so a forged fetch can't write.
  if (me.church.organization_type !== 'church') {
    return { me: null, error: 'not_a_church' as const };
  }
  return { me, error: null };
}

function validate(input: {
  name: string;
  dayOfWeek: number;
  startTime: string;
  offsetMinutes: number;
}): string | null {
  const name = input.name.trim();
  if (!name) return 'name_required';
  if (name.length > MAX_NAME) return 'name_too_long';
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return 'invalid_day';
  }
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) return 'invalid_time';
  if (
    !Number.isInteger(input.offsetMinutes) ||
    input.offsetMinutes < 0 ||
    input.offsetMinutes > MAX_OFFSET
  ) {
    return 'invalid_offset';
  }
  return null;
}

export async function createService(input: {
  name: string;
  dayOfWeek: number;
  startTime: string;
  offsetMinutes: number;
}): Promise<ServiceResult> {
  const { me, error } = await requireAdmin();
  if (!me) return { ok: false, error };

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { data, error: insErr } = await supabase
    .from('church_services')
    .insert({
      church_id: me.church.id,
      name: input.name.trim(),
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      volunteer_arrival_offset_minutes: input.offsetMinutes,
      created_by: me.user.id,
    })
    .select('id, name, day_of_week, start_time')
    .single();
  if (insErr || !data) return { ok: false, error: insErr?.message ?? 'insert_failed' };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'church_service',
    entityId: data.id,
    afterValue: {
      name: data.name,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      volunteer_arrival_offset_minutes: input.offsetMinutes,
    },
  });

  revalidatePath('/settings/services');
  return { ok: true };
}

export async function updateService(input: {
  id: string;
  name: string;
  dayOfWeek: number;
  startTime: string;
  offsetMinutes: number;
  isActive: boolean;
}): Promise<ServiceResult> {
  const { me, error } = await requireAdmin();
  if (!me) return { ok: false, error };

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();

  // Read the current row for the audit before/after, and to confirm it
  // belongs to this church before writing. RLS enforces this too; the
  // check is here so a wrong id returns a clear error instead of a
  // silent zero-row update.
  const { data: before } = await supabase
    .from('church_services')
    .select('*')
    .eq('id', input.id)
    .maybeSingle();
  if (!before || before.church_id !== me.church.id) {
    return { ok: false, error: 'not_found' };
  }

  const { error: upErr } = await supabase
    .from('church_services')
    .update({
      name: input.name.trim(),
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      volunteer_arrival_offset_minutes: input.offsetMinutes,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'church_service',
    entityId: input.id,
    beforeValue: {
      name: before.name,
      day_of_week: before.day_of_week,
      start_time: before.start_time,
      volunteer_arrival_offset_minutes: before.volunteer_arrival_offset_minutes,
      is_active: before.is_active,
    },
    afterValue: {
      name: input.name.trim(),
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      volunteer_arrival_offset_minutes: input.offsetMinutes,
      is_active: input.isActive,
    },
  });

  revalidatePath('/settings/services');
  return { ok: true };
}

// Two-stage delete: an active service is deactivated, an already-inactive
// one is removed for good. That way the destructive step is always the
// second one, and a service that is merely paused for a season can be
// switched back on rather than re-created.
export type DeleteResult =
  | { ok: true; deactivated: true }
  | { ok: true; deactivated: false }
  | { ok: false; error: string };

export async function deleteService(id: string): Promise<DeleteResult> {
  const { me, error } = await requireAdmin();
  if (!me) return { ok: false, error };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('church_services')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!before || before.church_id !== me.church.id) {
    return { ok: false, error: 'not_found' };
  }

  if (before.is_active) {
    const { error: upErr } = await supabase
      .from('church_services')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) return { ok: false, error: upErr.message };

    await logAudit({
      churchId: me.church.id,
      userId: me.user.id,
      action: 'deactivate',
      entityType: 'church_service',
      entityId: id,
      beforeValue: { name: before.name, is_active: true },
      afterValue: { name: before.name, is_active: false },
    });

    revalidatePath('/settings/services');
    return { ok: true, deactivated: true };
  }

  const { error: delErr } = await supabase
    .from('church_services')
    .delete()
    .eq('id', id);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'church_service',
    entityId: id,
    beforeValue: {
      name: before.name,
      day_of_week: before.day_of_week,
      start_time: before.start_time,
      is_active: false,
    },
    afterValue: { deleted: true },
  });

  revalidatePath('/settings/services');
  return { ok: true, deactivated: false };
}
