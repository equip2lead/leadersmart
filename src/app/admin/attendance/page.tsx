import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { DepartmentPicker, type DepartmentOption } from '../_shared/department-picker';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 100;

// Cross-department attendance readout. Aggregates per-schedule
// present/absent counts so an admin can scan the whole church at once.
type ScheduleWithAttendance = {
  id: string;
  service_date: string;
  service_name: string;
  department_id: string;
  department: { name: string | null } | { name: string | null }[] | null;
  present: number;
  absent: number;
  marked_by_names: string[];
};

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const params = await searchParams;
  const { user, church } = await requireRole(ADMIN_ROLES);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const filterDept = (params.dept ?? '').trim();

  const { data: depts } = await supabase
    .from('departments')
    .select('id, name')
    .eq('church_id', church.id)
    .eq('is_active', true)
    .order('display_order');
  const deptOptions: DepartmentOption[] = (depts ?? []).map((d) => ({
    id: d.id,
    name: d.name,
  }));

  let scheduleQ = supabase
    .from('schedules')
    .select(
      'id, service_date, service_name, department_id, department:departments!inner(name, church_id)',
    )
    .eq('department.church_id', church.id)
    .order('service_date', { ascending: false })
    .limit(PAGE_LIMIT);
  if (filterDept) scheduleQ = scheduleQ.eq('department_id', filterDept);
  const { data: rawSchedules } = await scheduleQ;

  const scheduleIds = (rawSchedules ?? []).map((s) => s.id);

  let attendanceRows: Array<{
    schedule_id: string;
    showed_up: boolean;
    marked_by_user_id: string | null;
  }> = [];
  if (scheduleIds.length > 0) {
    const { data: att } = await supabase
      .from('team_attendance')
      .select('schedule_id, showed_up, marked_by_user_id')
      .in('schedule_id', scheduleIds);
    attendanceRows = att ?? [];
  }

  // Batch-fetch names for anyone who marked attendance so we can render
  // attribution without an N+1 join.
  const markerIds = Array.from(
    new Set(attendanceRows.map((a) => a.marked_by_user_id).filter((v): v is string => !!v)),
  );
  let markerNameById: Record<string, string> = {};
  if (markerIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', markerIds);
    markerNameById = Object.fromEntries((users ?? []).map((u) => [u.id, u.full_name]));
  }

  const schedules: ScheduleWithAttendance[] = (rawSchedules ?? []).map((s) => {
    const rows = attendanceRows.filter((a) => a.schedule_id === s.id);
    const present = rows.filter((r) => r.showed_up).length;
    const absent = rows.filter((r) => !r.showed_up).length;
    const markerIdsThisSchedule = Array.from(
      new Set(rows.map((r) => r.marked_by_user_id).filter((v): v is string => !!v)),
    );
    const marked_by_names = markerIdsThisSchedule
      .map((id) => markerNameById[id])
      .filter((n): n is string => !!n);
    return {
      id: s.id,
      service_date: s.service_date,
      service_name: s.service_name,
      department_id: s.department_id,
      department: s.department,
      present,
      absent,
      marked_by_names,
    };
  });

  const nameFrom = (
    ref: { name: string | null } | { name: string | null }[] | null,
  ): string | null => {
    const r = Array.isArray(ref) ? ref[0] : ref;
    return r?.name ?? null;
  };

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('adminAggregate.attendance.title', lang)}
        subtitle={t('adminAggregate.attendance.subtitle', lang)}
      />

      <div className="mt-6 card">
        <DepartmentPicker
          basePath="/admin/attendance"
          selectedId={filterDept}
          options={deptOptions}
          lang={lang}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {schedules.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">
            {t('adminAggregate.emptyForFilter', lang)}
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{t('adminAggregate.col.date', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.department', lang)}</th>
                <th className="px-4 py-3">{t('sched.form.name', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.present', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.absent', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.markedBy', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                    {formatDate(s.service_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    {nameFrom(s.department) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">{s.service_name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                    {s.present}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-700">
                    {s.absent}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {s.marked_by_names.length > 0
                      ? s.marked_by_names.join(', ')
                      : t('adminAggregate.notMarkedYet', lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-muted">
        <Link href="/admin" className="hover:underline">
          ← {t('common.back', lang)}
        </Link>
      </p>
    </div>
  );
}
