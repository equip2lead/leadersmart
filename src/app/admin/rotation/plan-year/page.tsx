import { getMe } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { formatEventDate } from '@/lib/events';
import { fifthSundaysInYear, monthLabel } from '@/lib/rotation-schedule';
import { YearPlanner, type PlannedFifthSunday } from './_planner';

export const dynamic = 'force-dynamic';

export default async function PlanYearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  // Access was already settled by the layout above — ministry, opted-out and
  // non-admin never reach this component.
  const { user, church } = await getMe();
  const lang = user.preferred_language;

  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1];
  const requested = Number(params.year);
  const year = years.includes(requested) ? requested : thisYear;

  const supabase = await createClient();
  const { data: savedRows } = await supabase
    .from('fifth_sunday_dates')
    .select('service_date')
    .eq('church_id', church.id)
    .eq('year', year);
  const saved = new Set(
    ((savedRows ?? []) as Array<{ service_date: string }>).map((r) => r.service_date),
  );

  // Which Sundays are fifth ones is a fact about the calendar, so it is
  // computed here every render rather than read back from the table. The
  // stored rows answer a different question — which of them this church has
  // committed to — and that is what the Saved column shows.
  const rows: PlannedFifthSunday[] = fifthSundaysInYear(year).map((f) => ({
    monthLabel: monthLabel(year, f.month, lang),
    date: f.date,
    dateLabel: formatEventDate(f.date, lang, { weekday: true }),
    saved: saved.has(f.date),
  }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('rotation.admin.plan_year.page_title', lang)}
        subtitle={t('rotation.admin.plan_year.subtitle', lang)}
      />
      <div className="mt-6">
        <YearPlanner lang={lang} year={year} years={years} rows={rows} />
      </div>
    </div>
  );
}
