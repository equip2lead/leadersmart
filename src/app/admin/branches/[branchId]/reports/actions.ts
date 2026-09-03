'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { REPORT_SECTIONS, REPORT_SECTION_MAX } from '@/lib/types';
import { eligibleMonths } from '@/lib/reports';
import type { BranchReport } from '@/lib/types';

export type ReportResult = { ok: true } | { ok: false; error: string };
export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const MAX_COMMENT = 1000;
const PG_UNIQUE_VIOLATION = '23505';

export type ReportSections = {
  activities: string;
  leadership_updates: string;
  wins: string;
  challenges: string;
  prayer_requests: string;
};

async function requireReportAdmin() {
  const me = await getMe();
  if (!ADMIN_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_admin' as const };
  }
  if (me.church.organization_type !== 'ministry') {
    return { me: null, error: 'not_a_ministry' as const };
  }
  return { me, error: null };
}

// A report has no church_id — tenancy comes from its branch. Every write
// proves the branch belongs to the caller first.
async function branchInOrg(branchId: string, churchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('branches')
    .select('id, name, church_id')
    .eq('id', branchId)
    .maybeSingle();
  if (!data || data.church_id !== churchId) return null;
  return data;
}

async function ownedReport(id: string, churchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('branch_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const branch = await branchInOrg(data.branch_id, churchId);
  if (!branch) return null;
  return { report: data as BranchReport, branch };
}

function revalidate(branchId: string, reportId?: string) {
  revalidatePath(`/admin/branches/${branchId}/reports`);
  if (reportId) revalidatePath(`/admin/branches/${branchId}/reports/${reportId}`);
  revalidatePath('/admin');
}

function tooLong(sections: ReportSections): boolean {
  return REPORT_SECTIONS.some(
    (k) => (sections[k] ?? '').trim().length > REPORT_SECTION_MAX,
  );
}

export async function createReport(
  branchId: string,
  reportMonth: string,
): Promise<CreateResult> {
  const { me, error } = await requireReportAdmin();
  if (!me) return { ok: false, error };

  // Only months the form actually offers. Without this a crafted request
  // could file a report for an arbitrary date.
  if (!eligibleMonths().includes(reportMonth)) {
    return { ok: false, error: 'invalid_month' };
  }
  const branch = await branchInOrg(branchId, me.church.id);
  if (!branch) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { data, error: insErr } = await supabase
    .from('branch_reports')
    .insert({
      branch_id: branchId,
      report_month: reportMonth,
      status: 'draft',
      created_by: me.user.id,
    })
    .select('id')
    .single();

  if (insErr || !data) {
    return {
      ok: false,
      error:
        insErr?.code === PG_UNIQUE_VIOLATION
          ? 'duplicate_month'
          : (insErr?.message ?? 'insert_failed'),
    };
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'branch_report',
    entityId: data.id,
    afterValue: { branch_id: branchId, report_month: reportMonth, status: 'draft' },
  });

  revalidate(branchId, data.id);
  return { ok: true, id: data.id };
}

export async function updateReportDraft(
  id: string,
  sections: ReportSections,
): Promise<ReportResult> {
  const { me, error } = await requireReportAdmin();
  if (!me) return { ok: false, error };
  if (tooLong(sections)) return { ok: false, error: 'section_too_long' };

  const owned = await ownedReport(id, me.church.id);
  if (!owned) return { ok: false, error: 'not_found' };
  // An approved report is a record of what was reviewed; editing it would
  // silently change what HQ signed off on.
  if (owned.report.status === 'approved') {
    return { ok: false, error: 'wrong_status' };
  }

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('branch_reports')
    .update({
      ...Object.fromEntries(
        REPORT_SECTIONS.map((k) => [k, sections[k].trim() || null]),
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (upErr) return { ok: false, error: upErr.message };

  revalidate(owned.report.branch_id, id);
  return { ok: true };
}

export async function submitReport(
  id: string,
  sections: ReportSections,
): Promise<ReportResult> {
  const { me, error } = await requireReportAdmin();
  if (!me) return { ok: false, error };
  if (tooLong(sections)) return { ok: false, error: 'section_too_long' };

  // All five are required to submit — the point of the form is a complete
  // picture, and a half-filled report wastes the reviewer's time.
  if (REPORT_SECTIONS.some((k) => !sections[k].trim())) {
    return { ok: false, error: 'all_sections_required' };
  }

  const owned = await ownedReport(id, me.church.id);
  if (!owned) return { ok: false, error: 'not_found' };
  if (owned.report.status === 'approved') {
    return { ok: false, error: 'wrong_status' };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('branch_reports')
    .update({
      ...Object.fromEntries(
        REPORT_SECTIONS.map((k) => [k, sections[k].trim()]),
      ),
      status: 'submitted',
      submitted_at: now,
      // Resubmitting after a send-back clears the prior verdict, so the
      // report doesn't display stale feedback next to a fresh submission.
      reviewer_comment: null,
      reviewed_at: null,
      reviewed_by: null,
      updated_at: now,
    })
    .eq('id', id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'branch_report',
    entityId: id,
    beforeValue: { status: owned.report.status },
    afterValue: { status: 'submitted' },
  });

  revalidate(owned.report.branch_id, id);
  return { ok: true };
}

// Approve and send-back are owner-only. RLS cannot express this — a
// policy sees the row, not which columns an UPDATE touches — so the split
// between "admins may draft" and "only the owner may rule on it" lives
// here.
export async function approveReport(id: string): Promise<ReportResult> {
  const { me, error } = await requireReportAdmin();
  if (!me) return { ok: false, error };
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const owned = await ownedReport(id, me.church.id);
  if (!owned) return { ok: false, error: 'not_found' };
  if (owned.report.status !== 'submitted') {
    return { ok: false, error: 'wrong_status' };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('branch_reports')
    .update({
      status: 'approved',
      reviewed_at: now,
      reviewed_by: me.user.id,
      reviewer_comment: null,
      updated_at: now,
    })
    .eq('id', id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'branch_report',
    entityId: id,
    beforeValue: { status: 'submitted' },
    afterValue: { status: 'approved' },
  });

  revalidate(owned.report.branch_id, id);
  return { ok: true };
}

export async function sendReportBackForReview(
  id: string,
  comment: string,
): Promise<ReportResult> {
  const { me, error } = await requireReportAdmin();
  if (!me) return { ok: false, error };
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const trimmed = comment.trim();
  // Sending a report back without saying why leaves the branch guessing.
  if (!trimmed) return { ok: false, error: 'comment_required' };
  if (trimmed.length > MAX_COMMENT) return { ok: false, error: 'comment_too_long' };

  const owned = await ownedReport(id, me.church.id);
  if (!owned) return { ok: false, error: 'not_found' };
  if (owned.report.status !== 'submitted') {
    return { ok: false, error: 'wrong_status' };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('branch_reports')
    .update({
      status: 'needs_review',
      reviewer_comment: trimmed,
      reviewed_at: now,
      reviewed_by: me.user.id,
      updated_at: now,
    })
    .eq('id', id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'branch_report',
    entityId: id,
    beforeValue: { status: 'submitted' },
    afterValue: { status: 'needs_review', reviewer_comment: trimmed },
  });

  revalidate(owned.report.branch_id, id);
  return { ok: true };
}

export async function deleteReport(id: string): Promise<ReportResult> {
  const { me, error } = await requireReportAdmin();
  if (!me) return { ok: false, error };
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const owned = await ownedReport(id, me.church.id);
  if (!owned) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { error: delErr } = await supabase
    .from('branch_reports')
    .delete()
    .eq('id', id);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'branch_report',
    entityId: id,
    beforeValue: {
      report_month: owned.report.report_month,
      status: owned.report.status,
    },
    afterValue: { deleted: true },
  });

  revalidate(owned.report.branch_id);
  return { ok: true };
}
