import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { hasAdminKey } from '@/lib/supabase/admin';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { InviteUserForm } from './_invite-form';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 50;

export default async function UsersPage() {
  const { user: me, church } = await requireRole(['senior_pastor', 'admin']);
  const lang = me.preferred_language;
  const supabase = await createClient();

  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_active, last_login_at')
    .eq('church_id', church.id)
    .order('created_at', { ascending: true })
    .limit(PAGE_LIMIT);

  const users = data ?? [];
  const serviceKeyAvailable = hasAdminKey();

  function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('admin.users.title', lang)}
        subtitle={t('users.subtitle', lang)}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">{t('invite.title', lang)}</h2>
          <p className="mt-1 text-xs text-muted">{t('invite.helper', lang)}</p>
          <div className="mt-4">
            <InviteUserForm lang={lang} serviceKeyAvailable={serviceKeyAvailable} />
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
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm font-medium text-ink">
                      {u.full_name}
                      {u.id === me.id && (
                        <span className="ml-2 text-xs text-muted">
                          ({t('users.you', lang)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-body">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-body">
                      {t(`role.${u.role}`, lang)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.is_active
                          ? t('users.status.active', lang)
                          : t('users.status.inactive', lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {formatDate(u.last_login_at)}
                    </td>
                  </tr>
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
