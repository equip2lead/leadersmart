'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS, isAdmin } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type ActionResult = { ok: true; is_complete: boolean } | { ok: false; error: string };

export async function togglePastorTask(taskId: string): Promise<ActionResult> {
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  const supabase = await createClient();

  const { data: task } = await supabase
    .from('weekly_execution_tasks')
    .select(
      'id, is_complete, pastor_assignment:pastor_assignments!inner(id, pastor_user_id, church_id)',
    )
    .eq('id', taskId)
    .maybeSingle();

  const owned = task?.pastor_assignment as
    | { id: string; pastor_user_id: string; church_id: string }
    | { id: string; pastor_user_id: string; church_id: string }[]
    | undefined;
  const ownedRow = Array.isArray(owned) ? owned[0] : owned;

  if (!task || !ownedRow || ownedRow.church_id !== church.id) {
    return { ok: false, error: 'not_found' };
  }
  const canEdit = ownedRow.pastor_user_id === user.id || isAdmin(user.role);
  if (!canEdit) return { ok: false, error: 'not_found' };

  const nextDone = !task.is_complete;
  const { error } = await supabase
    .from('weekly_execution_tasks')
    .update({
      is_complete: nextDone,
      completed_at: nextDone ? new Date().toISOString() : null,
      completed_by_user_id: nextDone ? user.id : null,
    })
    .eq('id', taskId);

  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'update',
    entityType: 'weekly_execution_task',
    entityId: taskId,
    beforeValue: { is_complete: task.is_complete },
    afterValue: {
      is_complete: nextDone,
      on_behalf_of:
        ownedRow.pastor_user_id === user.id ? null : ownedRow.pastor_user_id,
    },
  });

  revalidatePath('/pastor');
  revalidatePath('/pastor/weekly-plan');
  return { ok: true, is_complete: nextDone };
}
