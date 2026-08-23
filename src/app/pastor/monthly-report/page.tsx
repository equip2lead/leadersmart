import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { MonthlyReportForm } from './_form';
import { loadPastorPageContext } from '../_context';

export const dynamic = 'force-dynamic';

export default async function MonthlyReportPage() {
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  const lang = user.preferred_language;
  const supabase = await createClient();
  const ctx = await loadPastorPageContext(user, church.id);

  if (ctx.kind === 'no_active') {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('pastor.report.title', lang)}
          subtitle={t('pastor.noActiveAssignment', lang)}
        />
        <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-muted">
          <Link href="/admin/assignments" className="text-brand-700 hover:underline">
            {t('pastor.setAssignmentLink', lang)}
          </Link>
        </p>
      </div>
    );
  }

  const { data: existing } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('pastor_assignment_id', ctx.assignmentId)
    .maybeSingle();

  const submitted = !!(existing?.submitted_at && !existing.is_draft);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={
          ctx.isOnBehalf
            ? t('pastor.report.onBehalfTitle', lang).replace('{name}', ctx.pastorName)
            : t('pastor.report.title', lang)
        }
        subtitle={`${t('pastor.potm', lang)} — ${ctx.assignmentMonth}`}
      />

      {ctx.isOnBehalf && (
        <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {t('pastor.report.onBehalfBanner', lang).replace('{name}', ctx.pastorName)}
        </div>
      )}

      <MonthlyReportForm
        assignmentId={ctx.assignmentId}
        existingId={existing?.id ?? null}
        lang={lang}
        canSubmit={!ctx.isOnBehalf}
        initial={{
          c1: (existing?.criterion_1_data as Record<string, string>) ?? {},
          c2: (existing?.criterion_2_data as Record<string, string>) ?? {},
          c3: (existing?.criterion_3_data as Record<string, string>) ?? {},
          c4: (existing?.criterion_4_data as Record<string, string>) ?? {},
          c5: (existing?.criterion_5_data as Record<string, string>) ?? {},
          c6: (existing?.criterion_6_data as Record<string, string>) ?? {},
          c7: (existing?.criterion_7_data as Record<string, string>) ?? {},
          c8: (existing?.criterion_8_data as Record<string, string>) ?? {},
          recommendations: existing?.recommendations ?? '',
          handoverNotes: existing?.handover_notes ?? '',
          submitted,
        }}
      />
    </div>
  );
}
