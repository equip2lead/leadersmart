'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS, isAdmin } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type SaveResult =
  | { ok: true; id: string; savedAt: string }
  | { ok: false; error: string };

export type SaveInput = {
  rowId: string | null;
  assignmentId: string;
  serviceDate: string;
  itemsChecked: Record<string, boolean>;
  attendanceCount: number | null;
  offeringTotal: number | null;
  newVisitorsCount: number | null;
  issuesText: string | null;
  isDraft: boolean;
};

export async function saveChecklist(input: SaveInput): Promise<SaveResult> {
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  const supabase = await createClient();

  // Assignment must belong to this church. Owner + admin_pastor can act
  // on behalf of anyone; the assigned pastor can act on their own.
  const { data: assignment } = await supabase
    .from('pastor_assignments')
    .select('id, pastor_user_id, church_id')
    .eq('id', input.assignmentId)
    .maybeSingle();
  if (!assignment || assignment.church_id !== church.id) {
    return { ok: false, error: 'unauthorized' };
  }
  const isOwnAssignment = assignment.pastor_user_id === user.id;
  if (!isOwnAssignment && !isAdmin(user.role)) {
    return { ok: false, error: 'unauthorized' };
  }

  const payload = {
    pastor_assignment_id: input.assignmentId,
    service_date: input.serviceDate,
    items_checked: input.itemsChecked,
    attendance_count: input.attendanceCount,
    offering_total: input.offeringTotal,
    new_visitors_count: input.newVisitorsCount,
    issues_text: input.issuesText,
    is_draft: input.isDraft,
    submitted_at: input.isDraft ? null : new Date().toISOString(),
    // Always stamp the caller. Records who actually clicked "save" or
    // "submit" — separate from the pastor_assignment.pastor_user_id.
    submitted_by_user_id: user.id,
  };

  let rowId: string;
  let action: 'create' | 'update';
  if (input.rowId) {
    rowId = input.rowId;
    action = 'update';
    const { error } = await supabase
      .from('sunday_checklists')
      .update(payload)
      .eq('id', rowId);
    if (error) return { ok: false, error: error.message };
  } else {
    action = 'create';
    const { data, error } = await supabase
      .from('sunday_checklists')
      .insert(payload)
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };
    rowId = data.id;
  }

  // Only audit final submits and the initial create — noisy to audit every
  // 15-second draft autosave.
  if (!input.isDraft || action === 'create') {
    await logAudit({
      churchId: church.id,
      userId: user.id,
      action,
      entityType: 'sunday_checklist',
      entityId: rowId,
      afterValue: {
        service_date: input.serviceDate,
        is_draft: input.isDraft,
        on_behalf_of: isOwnAssignment ? null : assignment.pastor_user_id,
      },
    });
  }

  if (!input.isDraft) {
    revalidatePath('/pastor');
    revalidatePath('/pastor/sunday-checklist');
  }
  return { ok: true, id: rowId, savedAt: new Date().toISOString() };
}
