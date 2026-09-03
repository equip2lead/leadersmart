import { notFound, redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { formatDate, formatMonth } from '@/lib/reports';
import { REPORT_SECTIONS } from '@/lib/types';
import type { BranchReport, ReportSection } from '@/lib/types';
import { ReportsBreadcrumb, StatusBadge } from '../_shared';
import { ReportForm } from '../_form';
import { ReviewActions } from './_review';

export const dynamic = 'force-dynamic';

const SECTION_LABELS: Record<ReportSection, string> = {
  activities: 'reports.form.activities_label',
  leadership_updates: 'reports.form.leadership_label',
  wins: 'reports.form.wins_label',
  challenges: 'reports.form.challenges_label',
  prayer_requests: 'reports.form.prayer_label',
};

export default async function BranchReportDetailPage({
  params,
}: {
  params: Promise<{ branchId: string; reportId: string }>;
}) {
  const { branchId, reportId } = await params;
  const { user, church } = await requireRole(ADMIN_ROLES);
  if (church.organization_type === 'church') redirect('/admin');

  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, church_id')
    .eq('id', branchId)
    .eq('church_id', church.id)
    .maybeSingle();
  if (!branch) notFound();

  const { data: reportRow } = await supabase
    .from('branch_reports')
    .select('*')
    .eq('id', reportId)
    .eq('branch_id', branch.id)
    .maybeSingle();
  if (!reportRow) notFound();
  const report = reportRow as BranchReport;

  // Two name lookups in one query rather than two round trips.
  const ids = [report.created_by, report.reviewed_by].filter(
    (v): v is string => !!v,
  );
  const { data: people } = ids.length
    ? await supabase.from('users').select('id, full_name').in('id', ids)
    : { data: [] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  const monthLabel = formatMonth(report.report_month, lang);
  // A draft or a sent-back report is still being written, so the page
  // opens straight into the form rather than a read-only view the author
  // then has to click out of.
  const editable = report.status === 'draft' || report.status === 'needs_review';

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <ReportsBreadcrumb
        lang={lang}
        branchId={branch.id}
        branchName={branch.name}
        trailing={monthLabel}
      />

      <PageHeading
        title={t('reports.detail.title', lang)
          .replace('{month}', monthLabel)
          .replace('{branch_name}', branch.name)}
        actions={<StatusBadge status={report.status} lang={lang} />}
      />

      <div className="mt-2 space-y-0.5 text-xs text-muted">
        {report.submitted_at && (
          <p>
            {t('reports.detail.submitted_by', lang)
              .replace(
                '{name}',
                nameById.get(report.created_by ?? '') ?? '—',
              )
              .replace('{date}', formatDate(report.submitted_at, lang))}
          </p>
        )}
        {report.reviewed_at && (
          <p>
            {t('reports.detail.reviewed_by', lang)
              .replace(
                '{name}',
                nameById.get(report.reviewed_by ?? '') ?? '—',
              )
              .replace('{date}', formatDate(report.reviewed_at, lang))}
          </p>
        )}
      </div>

      {report.status === 'needs_review' && report.reviewer_comment && (
        <div className="mt-6 rounded-xl border border-gold-warm-200 bg-gold-warm-50 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-gold-warm-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t('reports.detail.reviewer_comment_heading', lang)}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
            {report.reviewer_comment}
          </p>
        </div>
      )}

      {editable ? (
        <ReportForm
          lang={lang}
          branchId={branch.id}
          months={[]}
          existing={{
            id: report.id,
            month: report.report_month,
            sections: {
              activities: report.activities ?? '',
              leadership_updates: report.leadership_updates ?? '',
              wins: report.wins ?? '',
              challenges: report.challenges ?? '',
              prayer_requests: report.prayer_requests ?? '',
            },
          }}
        />
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {REPORT_SECTIONS.map((key) => (
              <section
                key={key}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <h2 className="text-sm font-bold text-ink">
                  {t(SECTION_LABELS[key], lang)}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-body">
                  {report[key] ?? '—'}
                </p>
              </section>
            ))}
          </div>

          {report.status === 'submitted' && isOwner(user.role) && (
            <div className="mt-6">
              <ReviewActions lang={lang} reportId={report.id} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
