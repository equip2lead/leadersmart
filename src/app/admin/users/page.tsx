import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { hasAdminKey } from '@/lib/supabase/admin';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { InviteUserForm } from './_invite-form';
import { UserRow, type UserRowData } from './_user-row';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 50;
// Soft warning kicks in at this Admin Pastor headcount. No hard cap —
// churches are trusted to size their leadership; the banner is a nudge
// to double-check that governance is still coherent past this point.
const ADMIN_PASTOR_SOFT_LIMIT = 10;

export default async function UsersPage() {
  const { user: me, church } = await requireRole(ADMIN_ROLES);
  const lang = me.preferred_language;
  const supabase = await createClient();

  const [usersRes, secondaryRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, email, role, is_active, last_login_at')
      .eq('church_id', church.id)
      .order('created_at', { ascending: true })
      .limit(PAGE_LIMIT),
    supabase
      .from('user_secondary_roles')
      .select('user_id, role')
      .eq('church_id', church.id),
  ]);

  const secondaryByUser: Record<string, UserRowData['secondary_roles']> = {};
  for (const row of secondaryRes.data ?? []) {
    (secondaryByUser[row.user_id] ??= []).push(row.role as UserRowData['secondary_roles'][number]);
  }

  const users: UserRowData[] = (usersRes.data ?? []).map((u) => ({
    ...u,
    secondary_roles: secondaryByUser[u.id] ?? [],
  }));
  const serviceKeyAvailable = hasAdminKey();
  const callerIsOwner = isOwner(me.role);

  // Count both the new-model 'admin_pastor' and legacy 'pastor' since
  // pre-migration accounts still carry the old label until the Phase 3
  // cleanup migration drops legacy enum values.
  const adminPastorCount = users.filter(
    (u) => u.role === 'admin_pastor' || u.role === 'pastor',
  ).length;
  const showSoftWarning = adminPastorCount >= ADMIN_PASTOR_SOFT_LIMIT;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('admin.users.title', lang)}
        subtitle={t('users.subtitle', lang)}
      />

      {showSoftWarning && (
        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            {t('users.softLimit.title', lang).replace(
              '{count}',
              String(adminPastorCount),
            )}
          </p>
          <p className="mt-1 text-xs">{t('users.softLimit.body', lang)}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">{t('invite.title', lang)}</h2>
          <p className="mt-1 text-xs text-muted">{t('invite.helper', lang)}</p>
          <div className="mt-4">
            <InviteUserForm
              lang={lang}
              serviceKeyAvailable={serviceKeyAvailable}
              callerIsOwner={callerIsOwner}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">{t('users.col.name', lang)}</th>
                  <th className="px-4 py-3">{t('users.col.email', lang)}</th>
                  <th className="px-4 py-3">{t('users.col.role', lang)}</th>
                  <th className="px-4 py-3">{t('users.col.status', lang)}</th>
                  <th className="px-4 py-3">{t('users.col.lastLogin', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    meId={me.id}
                    callerIsOwner={callerIsOwner}
                    currentAdminPastorCount={adminPastorCount}
                    lang={lang}
                  />
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {t('common.empty', lang)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
