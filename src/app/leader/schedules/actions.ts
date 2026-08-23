'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { LEADER_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type Slot = { role: string; team_member_id: string | null };

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function assertDepartmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  departmentId: string,
  userId: string,
  churchId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('departments')
    .select('id, leader_user_id, church_id')
    .eq('id', departmentId)
    .maybeSingle();
  return !!data && data.leader_user_id === userId && data.church_id === churchId;
}

function cleanSlots(input: unknown): Slot[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const s = raw as { role?: unknown; team_member_id?: unknown };
      const role = typeof s.role === 'string' ? s.role.trim() : '';
      const tm =
        typeof s.team_member_id === 'string' && s.team_member_id ? s.team_member_id : null;
      if (!role && !tm) return null;
      return { role, team_member_id: tm };
    })
    .filter((s): s is Slot => s !== null);
}

export async function createSchedule(
  departmentId: string,
  input: {
    serviceDate: string;
    serviceName: string;
    slots: Slot[];
    publish: boolean;
    notes: string | null;
  },
): Promise<ActionResult> {
  const { user, church } = await requireRole(LEADER_ROLES);
  const supabase = await createClient();

  if (!(await assertDepartmentOwned(supabase, departmentId, user.id, church.id))) {
    return { ok: false, error: 'unauthorized' };
  }

  const serviceName = input.serviceName.trim();
  const serviceDate = input.serviceDate.trim();
  if (!serviceName) return { ok: false, error: 'name_required' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) return { ok: false, error: 'invalid_date' };

  const slots = cleanSlots(input.slots);

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      department_id: departmentId,
      service_date: serviceDate,
      service_name: serviceName,
      slots,
      status: input.publish ? 'published' : 'draft',
      notes: input.notes,
      created_by_user_id: user.id,
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'create',
    entityType: 'schedule',
    entityId: data.id,
    afterValue: {
      service_date: serviceDate,
      service_name: serviceName,
      status: input.publish ? 'published' : 'draft',
      slot_count: slots.length,
    },
  });

  revalidatePath('/leader/schedules');
  revalidatePath('/leader');
  return { ok: true, id: data.id };
}

export async function setSchedulePublished(
  scheduleId: string,
  published: boolean,
): Promise<ActionResult> {
  const { user, church } = await requireRole(LEADER_ROLES);
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('schedules')
    .select('id, department_id, status')
    .eq('id', scheduleId)
    .maybeSingle();

  if (!before) return { ok: false, error: 'not_found' };
  if (!(await assertDepartmentOwned(supabase, before.department_id, user.id, church.id))) {
    return { ok: false, error: 'unauthorized' };
  }

  const nextStatus = published ? 'published' : 'draft';
  if (before.status === nextStatus) return { ok: true };

  const { error } = await supabase
    .from('schedules')
    .update({ status: nextStatus })
    .eq('id', scheduleId);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'update',
    entityType: 'schedule',
    entityId: scheduleId,
    beforeValue: { status: before.status },
    afterValue: { status: nextStatus },
  });

  revalidatePath('/leader/schedules');
  revalidatePath('/leader');
  return { ok: true };
}
