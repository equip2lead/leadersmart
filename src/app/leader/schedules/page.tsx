import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { NewScheduleForm, type MemberOption } from './_new-form';
import { ScheduleRowCard, type ScheduleRow } from './_row';
import type { Slot } from './actions';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 50;

type RawSchedule = {
  id: string;
  service_date: string;
  service_name: string;
  status: 'draft' | 'published';
  slots: unknown;
  created_at: string;
};

export default async function SchedulesPage() {
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
          title={t('leader.schedules.title', lang)}
          subtitle={t('leader.noDept', lang)}
        />
      </div>
    );
  }

  const [membersRes, schedulesRes] = await Promise.all([
    supabase
      .from('team_members')
      .select('id, full_name')
      .eq('department_id', dept.id)
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('schedules')
      .select('id, service_date, service_name, status, slots, created_at')
      .eq('department_id', dept.id)
      .order('service_date', { ascending: false })
      .limit(PAGE_LIMIT),
  ]);

  const members: MemberOption[] = (membersRes.data ?? []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
  }));
  const memberNames: Record<string, string> = {};
  for (const m of members) memberNames[m.id] = m.full_name;

  const rawSchedules = (schedulesRes.data ?? []) as RawSchedule[];

  // Batch-load confirmation counts for all listed schedules.
  const scheduleIds = rawSchedules.map((s) => s.id);
  let confirmationsByScheduleId: Record<string, number> = {};
  if (scheduleIds.length > 0) {
    const { data: confs } = await supabase
      .from('schedule_confirmations')
      .select('schedule_id, response')
      .in('schedule_id', scheduleIds)
      .eq('response', 'yes');
    confirmationsByScheduleId = (confs ?? []).reduce<Record<string, number>>((acc, c) => {
      acc[c.schedule_id] = (acc[c.schedule_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const schedules: ScheduleRow[] = rawSchedules.map((s) => {
    const slots = Array.isArray(s.slots) ? (s.slots as Slot[]) : [];
    return {
      id: s.id,
      service_date: s.service_date,
      service_name: s.service_name,
      status: s.status,
      slots,
      created_at: s.created_at,
      slot_count: slots.length,
      confirmed_count: confirmationsByScheduleId[s.id] ?? 0,
    };
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={t('leader.schedules.title', lang)} subtitle={dept.name} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">{t('sched.form.title', lang)}</h2>
          <p className="mt-1 text-xs text-muted">{t('sched.form.helper', lang)}</p>
          <div className="mt-4">
            {members.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t('sched.form.noMembers', lang)}
              </p>
            ) : (
              <NewScheduleForm departmentId={dept.id} members={members} lang={lang} />
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {schedules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
              {t('common.empty', lang)}
            </div>
          ) : (
            <ul className="space-y-3">
              {schedules.map((s) => (
                <ScheduleRowCard
                  key={s.id}
                  schedule={s}
                  memberNames={memberNames}
                  lang={lang}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
