import { requireRole } from '@/lib/auth';
import { LEADER_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { MemberForm } from './_member-form';
import { TeamMemberRow, type MemberRow } from './_row';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 50;

export default async function TeamPage() {
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
          title={t('leader.team.title', lang)}
          subtitle={t('leader.noDept', lang)}
        />
      </div>
    );
  }

  const { data } = await supabase
    .from('team_members')
    .select('id, full_name, phone, role_in_team, photo_url, is_active, joined_date')
    .eq('department_id', dept.id)
    .order('is_active', { ascending: false })
    .order('full_name', { ascending: true })
    .limit(PAGE_LIMIT);

  const members = (data ?? []) as MemberRow[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={t('leader.team.title', lang)} subtitle={dept.name} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">{t('team.addTitle', lang)}</h2>
          <MemberForm
            mode="create"
            departmentId={dept.id}
            initial={{ full_name: '', phone: '', role_in_team: null, photo_url: null }}
            lang={lang}
          />
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
                    <th className="px-4 py-3">{t('team.col.name', lang)}</th>
                    <th className="px-4 py-3">{t('team.col.phone', lang)}</th>
                    <th className="px-4 py-3">{t('team.col.role', lang)}</th>
                    <th className="px-4 py-3">{t('team.col.status', lang)}</th>
                    <th className="px-4 py-3" aria-label="actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <TeamMemberRow
                      key={m.id}
                      member={m}
                      departmentId={dept.id}
                      lang={lang}
                    />
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
