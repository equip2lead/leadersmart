import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

export const dynamic = 'force-dynamic';

type ScheduleRow = {
  id: string;
  service_date: string;
  status: 'draft' | 'published';
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

  const { data } = await supabase
    .from('schedules')
    .select('id, service_date, status, created_at')
    .eq('department_id', dept.id)
    .order('service_date', { ascending: false })
    .limit(20);

  const schedules = (data ?? []) as ScheduleRow[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('leader.schedules.title', lang)}
        subtitle={dept.name}
      />

      {schedules.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-muted">{t('common.empty', lang)}</p>
          <p className="mt-2 text-xs text-muted">
            Drag-and-drop schedule builder is in the next iteration.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Service date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-sm font-medium text-ink">
                    {s.service_date}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        s.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
