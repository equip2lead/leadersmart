import { getMe } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { formatEventDate } from '@/lib/events';
import {
  currentAndNextMonth,
  monthLabel,
  sundaysInMonth,
} from '@/lib/rotation-schedule';
import type { RotationAssignment, ServingGroup } from '@/lib/types';
import { ScheduleGrid, type CellData, type StationCol, type SundayRow } from './_grid';

export const dynamic = 'force-dynamic';

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const { user, church } = await getMe();
  const lang = user.preferred_language;

  // Only this month and next are offered. Generating further ahead is not
  // useful while volunteer availability is unknown that far out, and an
  // unbounded selector invites planning a year of assignments nobody will keep.
  const options = currentAndNextMonth();
  const requested = { year: Number(params.year), month: Number(params.month) };
  const picked =
    options.find((o) => o.year === requested.year && o.month === requested.month) ??
    options[0];
  const { year, month } = picked;

  const supabase = await createClient();
  const dates = sundaysInMonth(year, month);

  const [stationRes, fifthRes, scheduleRes, assignRes] = await Promise.all([
    supabase
      .from('rotation_stations')
      .select('id, name, min_volunteers')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .eq('is_fire_kids', false)
      .order('display_order')
      .order('name'),
    supabase
      .from('fifth_sunday_dates')
      .select('service_date')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .in('service_date', dates.length ? dates : ['1970-01-01']),
    supabase
      .from('rotation_schedules')
      .select('id, service_date, status, serving_group')
      .eq('church_id', church.id)
      .in('service_date', dates.length ? dates : ['1970-01-01']),
    supabase
      .from('rotation_assignments')
      .select('*')
      .eq('church_id', church.id)
      .in('service_date', dates.length ? dates : ['1970-01-01']),
  ]);

  const stations: StationCol[] = (
    (stationRes.data ?? []) as Array<{
      id: string;
      name: string;
      min_volunteers: number;
    }>
  ).map((s) => ({ id: s.id, name: s.name, minVolunteers: s.min_volunteers }));

  const fifth = new Set(
    ((fifthRes.data ?? []) as Array<{ service_date: string }>).map(
      (f) => f.service_date,
    ),
  );

  const scheduleByDate = new Map(
    (
      (scheduleRes.data ?? []) as Array<{
        id: string;
        service_date: string;
        status: string;
        serving_group: ServingGroup | null;
      }>
    ).map((s) => [s.service_date, s]),
  );

  const assignments = (assignRes.data ?? []) as RotationAssignment[];
  const volunteerIds = [
    ...new Set(assignments.map((a) => a.volunteer_id).filter(Boolean)),
  ] as string[];
  const { data: volRows } = volunteerIds.length
    ? await supabase.from('volunteers').select('id, full_name').in('id', volunteerIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const nameById = new Map(
    (volRows ?? []).map((v) => [v.id as string, v.full_name as string]),
  );

  const rows: SundayRow[] = dates.map((date) => {
    const schedule = scheduleByDate.get(date);
    const forDate = assignments.filter((a) => a.service_date === date);

    const cells: CellData[] = stations.map((s) => {
      // The assignment id travels with the name because that is what a move
      // updates — a person's name is not addressable, and the same volunteer
      // can hold assignments on several Sundays.
      const people = forDate
        .filter((a) => a.station_id === s.id && a.volunteer_id)
        .map((a) => ({
          assignmentId: a.id,
          name: nameById.get(a.volunteer_id as string) ?? '—',
        }));
      return {
        stationId: s.id,
        people,
        // Derived, not stored: counting what landed against what the station
        // asks for cannot go stale the way a saved flag would.
        understaffed: people.length > 0 && people.length < s.minVolunteers,
      };
    });

    return {
      date,
      dateLabel: formatEventDate(date, lang, { weekday: true }),
      group: schedule?.serving_group ?? null,
      isFifthSunday: fifth.has(date),
      scheduleId: schedule?.id ?? null,
      published: schedule?.status === 'published',
      cells,
    };
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('rotation.admin.schedule.page_title', lang)}
        subtitle={t('rotation.admin.schedule.subtitle', lang)}
      />
      <div className="mt-6">
        <ScheduleGrid
          lang={lang}
          year={year}
          month={month}
          monthOptions={options.map((o) => ({
            ...o,
            label: monthLabel(o.year, o.month, lang),
          }))}
          monthName={monthLabel(year, month, lang)}
          stations={stations}
          rows={rows}
          // Warnings come from a generate run, not from a page load — there is
          // nothing to warn about until someone asks for a schedule.
          initialWarnings={[]}
        />
      </div>
    </div>
  );
}
