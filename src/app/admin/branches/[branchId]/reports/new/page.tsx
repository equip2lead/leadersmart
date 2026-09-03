import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { eligibleMonths, formatMonth } from '@/lib/reports';
import { ReportsBreadcrumb } from '../_shared';
import { ReportForm } from '../_form';

export const dynamic = 'force-dynamic';

export default async function NewBranchReportPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
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

  const { data: existing } = await supabase
    .from('branch_reports')
    .select('report_month')
    .eq('branch_id', branch.id);

  const taken = new Set((existing ?? []).map((r) => r.report_month));
  const months = eligibleMonths()
    .filter((m) => !taken.has(m))
    .map((m) => ({ value: m, label: formatMonth(m, lang) }));

  // Nothing left to file — send them back rather than showing a form with
  // an empty month dropdown that can only fail.
  if (months.length === 0) redirect(`/admin/branches/${branch.id}/reports`);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <ReportsBreadcrumb
        lang={lang}
        branchId={branch.id}
        branchName={branch.name}
        trailing={t('reports.new_title', lang)}
      />
      <PageHeading
        title={t('reports.new_title', lang)}
        subtitle={branch.name}
      />
      <ReportForm lang={lang} branchId={branch.id} months={months} />
    </div>
  );
}
