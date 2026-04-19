import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  senior_pastor: 'Senior Pastor',
  admin: 'Admin',
  pastor: 'Pastor',
  department_leader: 'Department Leader',
};

export default async function UsersPage() {
  const { user: me, church } = await requireRole(['senior_pastor', 'admin']);
  const lang = me.preferred_language;
  const supabase = await createClient();

  const { data } = await supabase
    .from('users')
    .select('id, full_name, email, role, is_active, last_login_at')
    .eq('church_id', church.id)
    .order('created_at', { ascending: true });

  const users = data ?? [];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('admin.users.title', lang)}
        subtitle="Manage who can sign in to your LeaderSmart workspace."
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-sm font-medium text-ink">
                  {u.full_name}
                  {u.id === me.id && (
                    <span className="ml-2 text-xs text-muted">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-body">{u.email}</td>
                <td className="px-4 py-3 text-sm text-body">
                  {ROLE_LABEL[u.role] ?? u.role}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
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
  );
}
