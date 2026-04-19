import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { AttendanceList } from './_list';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
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
          title={t('leader.attendance.title', lang)}
          subtitle={t('leader.noDept', lang)}
        />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: members } = await supabase
    .from('team_members')
    .select('id, full_name')
    .eq('department_id', dept.id)
    .eq('is_active', true)
    .order('full_name');

  const { data: todaysAttendance } = await supabase
    .from('team_attendance')
    .select('team_member_id, is_present')
    .eq('department_id', dept.id)
    .eq('service_date', today);

  const presentSet: Record<string, boolean> = {};
  (todaysAttendance ?? []).forEach((a) => {
    presentSet[a.team_member_id] = !!a.is_present;
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('leader.attendance.title', lang)}
        subtitle={`${dept.name} — ${today}`}
      />
      <AttendanceList
        departmentId={dept.id}
        serviceDate={today}
        members={members ?? []}
        initial={presentSet}
      />
    </div>
  );
}
