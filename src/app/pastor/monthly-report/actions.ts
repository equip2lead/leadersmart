'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { PASTOR_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type SaveResult =
  | { ok: true; id: string; savedAt: string }
  | { ok: false; error: string };

export type SaveInput = {
  rowId: string | null;
  assignmentId: string;
  sections: {
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
    c6: string;
    c7: string;
    c8: string;
  };
  recommendations: string | null;
  handoverNotes: string | null;
  submit: boolean;
};

export async function saveMonthlyReport(input: SaveInput): Promise<SaveResult> {
  const { user, church } = await requireRole(PASTOR_ROLES);
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('pastor_assignments')
    .select('id, pastor_user_id, church_id')
    .eq('id', input.assignmentId)
    .maybeSingle();
  if (
    !assignment ||
    assignment.pastor_user_id !== user.id ||
    assignment.church_id !== church.id
  ) {
    return { ok: false, error: 'unauthorized' };
  }

  // Guard against overwriting a submitted (locked) report from a stale client.
  if (input.rowId) {
    const { data: existing } = await supabase
      .from('monthly_reports')
      .select('submitted_at, is_draft')
      .eq('id', input.rowId)
      .maybeSingle();
    if (existing && existing.submitted_at && !existing.is_draft) {
      return { ok: false, error: 'locked' };
    }
  }

  const payload = {
    pastor_assignment_id: input.assignmentId,
    criterion_1_data: { narrative: input.sections.c1 },
    criterion_2_data: { narrative: input.sections.c2 },
    criterion_3_data: { narrative: input.sections.c3 },
    criterion_4_data: { narrative: input.sections.c4 },
    criterion_5_data: { narrative: input.sections.c5 },
    criterion_6_data: { narrative: input.sections.c6 },
    criterion_7_data: { narrative: input.sections.c7 },
    criterion_8_data: { narrative: input.sections.c8 },
    recommendations: input.recommendations,
    handover_notes: input.handoverNotes,
    is_draft: !input.submit,
    submitted_at: input.submit ? new Date().toISOString() : null,
  };

  let rowId: string;
  let action: 'create' | 'update';
  if (input.rowId) {
    rowId = input.rowId;
    action = 'update';
    const { error } = await supabase
      .from('monthly_reports')
      .update(payload)
      .eq('id', rowId);
    if (error) return { ok: false, error: error.message };
  } else {
    action = 'create';
    const { data, error } = await supabase
      .from('monthly_reports')
      .insert(payload)
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };
    rowId = data.id;
  }

  if (input.submit || action === 'create') {
    await logAudit({
      churchId: church.id,
      userId: user.id,
      action,
      entityType: 'monthly_report',
      entityId: rowId,
      afterValue: { submitted: input.submit },
    });
  }

  if (input.submit) {
    revalidatePath('/pastor');
    revalidatePath('/pastor/monthly-report');
  }
  return { ok: true, id: rowId, savedAt: new Date().toISOString() };
}
