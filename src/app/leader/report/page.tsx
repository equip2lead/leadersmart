import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { WeeklyReportForm } from './_form';

export const dynamic = 'force-dynamic';

function weekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
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
  const wkEnd = addDays(wk, 7);

  const { data: existing } = await supabase
    .from('department_weekly_reports')
    .select('*')
    .eq('department_id', dept.id)
    .eq('week_start_date', wk)
    .maybeSingle();

  // Pre-fill Q1/Q2 by counting attendance across this week's schedules for this department.
  const { data: weekSchedules } = await supabase
    .from('schedules')
    .select('id')
    .eq('department_id', dept.id)
    .gte('service_date', wk)
    .lt('service_date', wkEnd);

  const scheduleIds = (weekSchedules ?? []).map((s) => s.id);
  let suggestedShowed = 0;
  let suggestedAbsent = 0;
  let hasAttendance = false;

  if (scheduleIds.length > 0) {
    const { data: attendance } = await supabase
      .from('team_attendance')
      .select('showed_up')
      .in('schedule_id', scheduleIds);

    if (attendance && attendance.length > 0) {
      hasAttendance = true;
      for (const row of attendance) {
        if (row.showed_up) suggestedShowed += 1;
        else suggestedAbsent += 1;
      }
    }
  }

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
        userId={user.id}
        initial={
          existing
            ? {
                showed_up_count: existing.showed_up_count ?? null,
                absent_count: existing.absent_count ?? null,
                went_well_text: existing.went_well_text ?? null,
                went_wrong_text: existing.went_wrong_text ?? null,
                help_needed_text: existing.help_needed_text ?? null,
              }
            : null
        }
        suggestedShowed={suggestedShowed}
        suggestedAbsent={suggestedAbsent}
        hasAttendance={hasAttendance}
        lang={lang}
      />
    </div>
  );
}
