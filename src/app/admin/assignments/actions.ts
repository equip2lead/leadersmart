'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import type { AssignmentStatus } from '@/lib/types';

export type ActionResult = { ok: true } | { ok: false; error: string };

const STATUSES: ReadonlyArray<AssignmentStatus> = ['upcoming', 'active', 'completed'];

function isStatus(v: string): v is AssignmentStatus {
  return (STATUSES as readonly string[]).includes(v);
}

// Coerces "2026-04" or "2026-04-01" to "YYYY-MM-01".
function normalizeMonth(input: string): string | null {
  const trimmed = input.trim();
  const yyyyMm = /^(\d{4})-(\d{2})$/.exec(trimmed);
  const yyyyMmDd = /^(\d{4})-(\d{2})-\d{2}$/.exec(trimmed);
  if (yyyyMm) return `${yyyyMm[1]}-${yyyyMm[2]}-01`;
  if (yyyyMmDd) return `${yyyyMmDd[1]}-${yyyyMmDd[2]}-01`;
  return null;
}

export async function createAssignment(formData: FormData): Promise<ActionResult> {
  const { user: me, church } = await requireRole(ADMIN_ROLES);
  const supabase = await createClient();

  const pastor_user_id = String(formData.get('pastor_user_id') ?? '').trim();
  const monthRaw = String(formData.get('assignment_month') ?? '');
  const statusRaw = String(formData.get('status') ?? 'upcoming');

  if (!pastor_user_id) return { ok: false, error: 'pastor_required' };
  const assignment_month = normalizeMonth(monthRaw);
  if (!assignment_month) return { ok: false, error: 'invalid_month' };
  if (!isStatus(statusRaw)) return { ok: false, error: 'invalid_status' };
  const status = statusRaw;

  // Belt-and-suspenders check for one-active constraint before the DB rejects it.
  if (status === 'active') {
    const { data: existingActive } = await supabase
      .from('pastor_assignments')
      .select('id')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .maybeSingle();
    if (existingActive) {
      return { ok: false, error: 'active_exists' };
    }
  }

  const { data, error } = await supabase
    .from('pastor_assignments')
    .insert({
      church_id: church.id,
      pastor_user_id,
      assignment_month,
      status,
    })
    .select('id')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      // Unique violation — either (church, month) already exists, or the
      // partial index rejected a second active assignment.
      return { ok: false, error: 'duplicate' };
    }
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'create',
    entityType: 'pastor_assignment',
    entityId: data.id,
    afterValue: { pastor_user_id, assignment_month, status },
  });

  // Clears the "you skipped Pastor of the Month" nudge on /admin.
  await supabase
    .from('user_onboarding_progress')
    .update({ pom_skipped_at: null, updated_at: new Date().toISOString() })
    .eq('user_id', me.id);

  revalidatePath('/admin/assignments');
  revalidatePath('/admin');
  return { ok: true };
}

export async function updateAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
): Promise<ActionResult> {
  const { user: me, church } = await requireRole(ADMIN_ROLES);
  const supabase = await createClient();

  if (!isStatus(status)) return { ok: false, error: 'invalid_status' };

  const { data: before } = await supabase
    .from('pastor_assignments')
    .select('id, status')
    .eq('id', assignmentId)
    .eq('church_id', church.id)
    .maybeSingle();

  if (!before) return { ok: false, error: 'not_found' };
  if (before.status === status) return { ok: true };

  if (status === 'active') {
    const { data: existingActive } = await supabase
      .from('pastor_assignments')
      .select('id')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .neq('id', assignmentId)
      .maybeSingle();
    if (existingActive) return { ok: false, error: 'active_exists' };
  }

  const { error } = await supabase
    .from('pastor_assignments')
    .update({ status })
    .eq('id', assignmentId)
    .eq('church_id', church.id);

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'active_exists' };
    return { ok: false, error: error.message };
  }

  await logAudit({
    churchId: church.id,
    userId: me.id,
    action: 'update',
    entityType: 'pastor_assignment',
    entityId: assignmentId,
    beforeValue: { status: before.status },
    afterValue: { status },
  });

  revalidatePath('/admin/assignments');
  revalidatePath('/admin');
  return { ok: true };
}
