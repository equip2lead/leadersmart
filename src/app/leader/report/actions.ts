'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type SaveInput = {
  rowId: string | null;
  departmentId: string;
  weekStart: string;
  showedUpCount: number | null;
  absentCount: number | null;
  wentWellText: string | null;
  wentWrongText: string | null;
  helpNeededText: string | null;
  submit: boolean;
};

export async function saveWeeklyReport(input: SaveInput): Promise<SaveResult> {
  const { user, church } = await requireRole(['department_leader']);
  const supabase = await createClient();

  // Verify the leader owns this department.
  const { data: dept } = await supabase
    .from('departments')
    .select('id, leader_user_id, church_id')
    .eq('id', input.departmentId)
    .maybeSingle();
  if (!dept || dept.leader_user_id !== user.id || dept.church_id !== church.id) {
    return { ok: false, error: 'unauthorized' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart)) {
    return { ok: false, error: 'invalid_week_start' };
  }

  const payload = {
    department_id: input.departmentId,
    week_start_date: input.weekStart,
    showed_up_count: input.showedUpCount,
    absent_count: input.absentCount,
    went_well_text: input.wentWellText,
    went_wrong_text: input.wentWrongText,
    help_needed_text: input.helpNeededText,
    submitted_by_user_id: input.submit ? user.id : null,
    submitted_at: input.submit ? new Date().toISOString() : null,
  };

  let rowId: string;
  let action: 'create' | 'update';
  if (input.rowId) {
    rowId = input.rowId;
    action = 'update';
    const { error } = await supabase
      .from('department_weekly_reports')
      .update(payload)
      .eq('id', rowId);
    if (error) return { ok: false, error: error.message };
  } else {
    action = 'create';
    const { data, error } = await supabase
      .from('department_weekly_reports')
      .insert(payload)
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };
    rowId = data.id;
  }

  // Audit only real user intent: submissions and initial create. Skip the
  // per-keystroke draft saves so audit_log doesn't fill up with noise.
  if (input.submit || action === 'create') {
    await logAudit({
      churchId: church.id,
      userId: user.id,
      action,
      entityType: 'department_weekly_report',
      entityId: rowId,
      afterValue: {
        week_start_date: input.weekStart,
        submitted: input.submit,
        showed_up_count: input.showedUpCount,
        absent_count: input.absentCount,
      },
    });
  }

  if (input.submit) {
    revalidatePath('/leader');
    revalidatePath('/leader/report');
    revalidatePath('/admin');
  }
  return { ok: true, id: rowId };
}
