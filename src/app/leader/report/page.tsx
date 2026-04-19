import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { WeeklyReportForm } from './_form';

export const dynamic = 'force-dynamic';

function weekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = day; // use Sunday as week start
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export default async function WeeklyReportPage() {
  const { user, church } = await requireRole(['department_leader']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data: dept } = await supabase
    .from('departments')
    .select('id, name')
    .eq('church_id', church.id)
    .eq('leader_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!dept) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('leader.report.title', lang)}
          subtitle={t('leader.noDept', lang)}
        />
      </div>
    );
  }

  const wk = weekStart();
  const { data: existing } = await supabase
    .from('department_weekly_reports')
    .select('*')
    .eq('department_id', dept.id)
    .eq('week_start_date', wk)
    .maybeSingle();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('leader.report.title', lang)}
        subtitle={`${dept.name} — week of ${wk}`}
      />
      <WeeklyReportForm
        departmentId={dept.id}
        weekStart={wk}
        existingId={existing?.id ?? null}
        initial={existing ?? null}
      />
    </div>
  );
}
