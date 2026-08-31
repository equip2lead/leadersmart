import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { getVocab } from '@/lib/vocabulary';
import { DepartmentForm, type LeaderOption } from './_department-form';
import { DepartmentRowCard, type DepartmentRow } from './_row';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 50;

// Roles eligible to be co-head of a department. Includes legacy names
// so pre-migration accounts still surface in the dropdown.
const CO_LEADER_ELIGIBLE_ROLES = [
  'admin_pastor',
  'department_head',
  'pastor',
  'department_leader',
] as const;

export default async function DepartmentsPage() {
  const { user, church } = await requireRole(ADMIN_ROLES);
  const lang = user.preferred_language;
  const v = getVocab(church.organization_type, lang);
  const supabase = await createClient();

  const [deptRes, leaderRes] = await Promise.all([
    supabase
      .from('departments')
      .select(
        // The nested selects give the joined user's full_name, aliased by
        // the FK column so PostgREST doesn't collide on the shared 'users'
        // target.
        `id, name, icon, description, leader_user_id, co_leader_1_user_id, co_leader_2_user_id, is_active,
          leader:users!leader_user_id(full_name),
          co_leader_1:users!co_leader_1_user_id(full_name),
          co_leader_2:users!co_leader_2_user_id(full_name)`,
      )
      .eq('church_id', church.id)
      .order('is_active', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(PAGE_LIMIT),
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .order('full_name'),
  ]);

  type NameJoin = { full_name: string | null } | null;
  type RawDept = {
    id: string;
    name: string;
    icon: string | null;
    description: string | null;
    leader_user_id: string | null;
    co_leader_1_user_id: string | null;
    co_leader_2_user_id: string | null;
    is_active: boolean;
    leader: NameJoin;
    co_leader_1: NameJoin;
    co_leader_2: NameJoin;
  };

  const departments: DepartmentRow[] = ((deptRes.data ?? []) as unknown as RawDept[]).map(
    (d) => ({
      id: d.id,
      name: d.name,
      icon: d.icon,
      description: d.description,
      leader_user_id: d.leader_user_id,
      leader_name: d.leader?.full_name ?? null,
      co_leader_1_user_id: d.co_leader_1_user_id,
      co_leader_1_name: d.co_leader_1?.full_name ?? null,
      co_leader_2_user_id: d.co_leader_2_user_id,
      co_leader_2_name: d.co_leader_2?.full_name ?? null,
      is_active: d.is_active,
    }),
  );

  const allActiveUsers = leaderRes.data ?? [];
  const leaders: LeaderOption[] = allActiveUsers.map((u) => ({
    id: u.id,
    full_name: u.full_name,
  }));
  const coLeaderCandidates: LeaderOption[] = allActiveUsers
    .filter((u) => (CO_LEADER_ELIGIBLE_ROLES as readonly string[]).includes(u.role))
    .map((u) => ({ id: u.id, full_name: u.full_name }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={v.departments}
        subtitle={t('dept.subtitle', lang)}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">
            {v.addUnitTitle}
          </h2>
          <DepartmentForm
            mode="create"
            initial={{
              name: '',
              icon: null,
              description: null,
              leader_user_id: null,
              co_leader_1_user_id: null,
              co_leader_2_user_id: null,
            }}
            leaders={leaders}
            coLeaderCandidates={coLeaderCandidates}
            lang={lang}
          />
        </div>

        <div className="lg:col-span-2">
          {departments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
              {t('common.empty', lang)}
            </div>
          ) : (
            <ul className="space-y-3">
              {departments.map((d) => (
                <DepartmentRowCard
                  key={d.id}
                  dept={d}
                  leaders={leaders}
                  coLeaderCandidates={coLeaderCandidates}
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
