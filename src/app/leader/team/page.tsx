import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { NewTeamMemberForm } from './_new-form';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
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
          title={t('leader.team.title', lang)}
          subtitle={t('leader.noDept', lang)}
        />
      </div>
    );
  }

  const { data } = await supabase
    .from('team_members')
    .select('id, full_name, phone, role_in_team, is_active, joined_date')
    .eq('department_id', dept.id)
    .order('joined_date', { ascending: false });

  const members = data ?? [];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('leader.team.title', lang)}
        subtitle={dept.name}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">{t('common.add', lang)}</h2>
          <NewTeamMemberForm departmentId={dept.id} />
        </div>

        <div className="lg:col-span-2">
          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
              {t('common.empty', lang)}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        {m.full_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-body">{m.phone}</td>
                      <td className="px-4 py-3 text-sm text-body">
                        {m.role_in_team ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            m.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
