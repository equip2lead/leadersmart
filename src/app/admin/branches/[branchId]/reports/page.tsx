import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { eligibleMonths, formatMonth } from '@/lib/reports';
import type { BranchReport } from '@/lib/types';
import { ReportsBreadcrumb } from './_shared';
import { ReportsList } from './_list';

export const dynamic = 'force-dynamic';

export default async function BranchReportsPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const { user, church } = await requireRole(ADMIN_ROLES);

  // Branch reports are ministry-only, like branches themselves.
  if (church.organization_type === 'church') redirect('/admin');

  const lang = user.preferred_language;
  const supabase = await createClient();

  // Scope the branch to this church so a uuid from another tenant 404s
  // rather than leaking a name.
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, church_id')
    .eq('id', branchId)
    .eq('church_id', church.id)
    .maybeSingle();
  if (!branch) notFound();

  const { data } = await supabase
    .from('branch_reports')
    .select('*')
    .eq('branch_id', branch.id)
    .order('report_month', { ascending: false });
  const reports = (data ?? []) as BranchReport[];

  // Offer only months that don't already have a report — the unique pair
  // means offering a taken month could only produce an error.
  const taken = new Set(reports.map((r) => r.report_month));
  const available = eligibleMonths().filter((m) => !taken.has(m));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <ReportsBreadcrumb
        lang={lang}
        branchId={branch.id}
        branchName={branch.name}
      />
      <PageHeading
        title={t('reports.page_title', lang)}
        subtitle={t('reports.page_subtitle', lang)}
        actions={
          available.length > 0 ? (
            <Link
              href={`/admin/branches/${branch.id}/reports/new`}
              className="btn-primary"
            >
              {t('reports.new_button', lang)}
            </Link>
          ) : (
            <span className="text-xs text-muted">
              {t('reports.all_months_reported', lang)}
            </span>
          )
        }
      />

      {reports.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <FileText
            className="mx-auto h-10 w-10 text-indigo-royal-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="mt-4 text-lg font-bold text-ink">
            {t('reports.empty_title', lang)}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-body">
            {t('reports.empty_body', lang)}
          </p>
          {available.length > 0 && (
            <Link
              href={`/admin/branches/${branch.id}/reports/new`}
              className="btn-primary mt-6"
            >
              {t('reports.new_button', lang)}
            </Link>
          )}
        </div>
      ) : (
        <ReportsList
          lang={lang}
          branchId={branch.id}
          branchName={branch.name}
          canDelete={isOwner(user.role)}
          rows={reports.map((r) => ({
            id: r.id,
            month: r.report_month,
            monthLabel: formatMonth(r.report_month, lang),
            status: r.status,
            submittedAt: r.submitted_at,
            reviewedAt: r.reviewed_at,
          }))}
        />
      )}
    </div>
  );
}
