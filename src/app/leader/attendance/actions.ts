'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type ActionResult = { ok: true; showed_up: boolean } | { ok: false; error: string };

export async function markAttendance(
  scheduleId: string,
  teamMemberId: string,
  showedUp: boolean,
): Promise<ActionResult> {
  const { user, church } = await requireRole(['department_leader']);
  const supabase = await createClient();

  // Verify the schedule belongs to a department this leader owns.
  const { data: sched } = await supabase
    .from('schedules')
    .select('id, department_id, department:departments!inner(leader_user_id, church_id)')
    .eq('id', scheduleId)
    .maybeSingle();

  const deptRow = sched?.department as
    | { leader_user_id: string; church_id: string }
    | { leader_user_id: string; church_id: string }[]
    | undefined;
  const dept = Array.isArray(deptRow) ? deptRow[0] : deptRow;

  if (!sched || !dept || dept.leader_user_id !== user.id || dept.church_id !== church.id) {
    return { ok: false, error: 'unauthorized' };
  }

  const { error } = await supabase
    .from('team_attendance')
    .upsert(
      {
        schedule_id: scheduleId,
        team_member_id: teamMemberId,
        showed_up: showedUp,
        marked_by_user_id: user.id,
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'schedule_id,team_member_id' },
    );

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'update',
    entityType: 'team_attendance',
    entityId: scheduleId,
    afterValue: { team_member_id: teamMemberId, showed_up: showedUp },
  });

  revalidatePath('/leader/attendance');
  return { ok: true, showed_up: showedUp };
}
