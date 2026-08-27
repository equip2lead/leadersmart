import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { LEADER_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { AttendanceList, type AttendanceMember } from './_list';
import { SchedulePicker, type ScheduleOption as PickerOption } from './_picker';

export const dynamic = 'force-dynamic';

type ScheduleOption = {
  id: string;
  service_date: string;
  service_name: string;
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ schedule?: string }>;
}) {
  const params = await searchParams;
  const { user, church } = await requireRole(LEADER_ROLES);
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
          title={t('leader.attendance.title', lang)}
          subtitle={t('leader.noDept', lang)}
        />
      </div>
    );
  }

  // Show the last 20 schedules so a leader can back-fill.
  const { data: schedRows } = await supabase
    .from('schedules')
    .select('id, service_date, service_name')
    .eq('department_id', dept.id)
    .order('service_date', { ascending: false })
    .limit(20);

  const schedules: ScheduleOption[] = (schedRows ?? []) as ScheduleOption[];

  if (schedules.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('leader.attendance.title', lang)}
          subtitle={dept.name}
        />
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-muted">{t('att.noSchedules', lang)}</p>
          <Link
            href="/leader/schedules"
            className="mt-3 inline-block text-sm font-medium text-indigo-royal-700 hover:underline"
          >
            {t('att.createScheduleLink', lang)}
          </Link>
        </div>
      </div>
    );
  }

  const selectedId =
    (params.schedule && schedules.find((s) => s.id === params.schedule)?.id) ??
    schedules[0].id;
  const selected = schedules.find((s) => s.id === selectedId)!;

  const [membersRes, attendanceRes] = await Promise.all([
    supabase
      .from('team_members')
      .select('id, full_name')
      .eq('department_id', dept.id)
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('team_attendance')
      .select('team_member_id, showed_up')
      .eq('schedule_id', selectedId),
  ]);

  const attendanceByMember: Record<string, boolean> = {};
  for (const row of attendanceRes.data ?? []) {
    attendanceByMember[row.team_member_id] = !!row.showed_up;
  }

  const members: AttendanceMember[] = (membersRes.data ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    showed_up:
      m.id in attendanceByMember ? attendanceByMember[m.id] : null,
  }));

  const dateLabel = new Date(selected.service_date + 'T00:00:00Z').toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-US',
  );

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('leader.attendance.title', lang)}
        subtitle={`${dept.name} — ${selected.service_name} · ${dateLabel}`}
      />

      <div className="mt-4">
        <SchedulePicker
          selectedId={selectedId}
          options={schedules.map<PickerOption>((s) => ({
            id: s.id,
            label: `${new Date(s.service_date + 'T00:00:00Z').toLocaleDateString(
              lang === 'fr' ? 'fr-FR' : 'en-US',
            )} — ${s.service_name}`,
          }))}
          lang={lang}
        />
      </div>

      <AttendanceList scheduleId={selectedId} members={members} lang={lang} />
    </div>
  );
}
