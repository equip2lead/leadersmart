import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { MonthlyReportForm } from './_form';

export const dynamic = 'force-dynamic';

export default async function MonthlyReportPage() {
  const { user, church } = await requireRole(['pastor']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data: active } = await supabase
    .from('pastor_assignments')
    .select('id, assignment_month')
    .eq('church_id', church.id)
    .eq('pastor_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!active) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('pastor.report.title', lang)}
          subtitle={t('pastor.notAssigned', lang)}
        />
      </div>
    );
  }

  const { data: existing } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('pastor_assignment_id', active.id)
    .maybeSingle();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('pastor.report.title', lang)}
        subtitle={`${t('pastor.potm', lang)} — ${active.assignment_month}`}
      />
      <MonthlyReportForm
        assignmentId={active.id}
        existingId={existing?.id ?? null}
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
        }}
      />
    </div>
  );
}
