'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS, isAdmin } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import type { TaskCategory } from '@/lib/types';

const CATEGORIES: ReadonlyArray<TaskCategory> = [
  'leadership',
  'senior_leadership',
  'department_oversight',
  'spiritual_followup',
  'communication',
  'service_organization',
  'evangelism',
  'report_clarity',
];

function isCategory(v: string): v is TaskCategory {
  return (CATEGORIES as readonly string[]).includes(v);
}

export type AddTaskResult =
  | {
      ok: true;
      task: {
        id: string;
        week_number: number;
        task_text: string;
        is_complete: boolean;
        category: TaskCategory;
        display_order: number;
      };
    }
  | { ok: false; error: string };

export type ToggleResult = { ok: true; is_complete: boolean } | { ok: false; error: string };

// Verifies the assignment belongs to the caller's church AND that the
// caller is either the assigned pastor or an admin acting on behalf.
async function assertCanEditAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
  userId: string,
  userRole: string,
  churchId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('pastor_assignments')
    .select('id, pastor_user_id, church_id')
    .eq('id', assignmentId)
    .maybeSingle();
  if (!data || data.church_id !== churchId) return false;
  if (data.pastor_user_id === userId) return true;
  return isAdmin(userRole as never);
}

export async function addWeeklyTask(
  assignmentId: string,
  week: number,
  text: string,
  category: string,
): Promise<AddTaskResult> {
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  const supabase = await createClient();

  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'text_required' };
  if (week < 1 || week > 5) return { ok: false, error: 'invalid_week' };
  if (!isCategory(category)) return { ok: false, error: 'invalid_category' };

  if (
    !(await assertCanEditAssignment(supabase, assignmentId, user.id, user.role, church.id))
  ) {
    return { ok: false, error: 'unauthorized' };
  }

  const { count } = await supabase
    .from('weekly_execution_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('pastor_assignment_id', assignmentId)
    .eq('week_number', week);

  const displayOrder = count ?? 0;

  const { data, error } = await supabase
    .from('weekly_execution_tasks')
    .insert({
      pastor_assignment_id: assignmentId,
      week_number: week,
      task_text: trimmed,
      category,
      display_order: displayOrder,
      is_complete: false,
    })
    .select('id, week_number, task_text, is_complete, category, display_order')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'create',
    entityType: 'weekly_execution_task',
    entityId: data.id,
    afterValue: { week_number: week, task_text: trimmed, category },
  });

  revalidatePath('/pastor');
  revalidatePath('/pastor/weekly-plan');
  return {
    ok: true,
    task: {
      id: data.id,
      week_number: data.week_number,
      task_text: data.task_text,
      is_complete: data.is_complete,
      category: data.category as TaskCategory,
      display_order: data.display_order,
    },
  };
}

export async function toggleWeeklyTask(taskId: string): Promise<ToggleResult> {
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
    afterValue: { is_complete: nextDone },
  });

  revalidatePath('/pastor');
  revalidatePath('/pastor/weekly-plan');
  return { ok: true, is_complete: nextDone };
}
