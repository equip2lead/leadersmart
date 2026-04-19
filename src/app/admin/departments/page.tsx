import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { NewDepartmentForm } from './_new-form';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
  const { user, church } = await requireRole(['senior_pastor', 'admin']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data } = await supabase
    .from('departments')
    .select('id, name, icon, description, leader_user_id, is_active, leader:users!leader_user_id(full_name)')
    .eq('church_id', church.id)
    .order('display_order', { ascending: true });

  type Row = {
    id: string;
    name: string;
    icon: string | null;
    description: string | null;
    leader_user_id: string | null;
    is_active: boolean;
    leader: { full_name: string | null } | null;
  };
  const departments = (data ?? []) as unknown as Row[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('admin.departments.page', lang)}
        subtitle="Create the ministry departments each leader owns."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">
            {t('common.add', lang)}
          </h2>
          <NewDepartmentForm churchId={church.id} />
        </div>

        <div className="lg:col-span-2">
          {departments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
              {t('common.empty', lang)}
            </div>
          ) : (
            <ul className="space-y-3">
              {departments.map((d) => (
                <li
                  key={d.id}
                  id={d.id}
                  className="card flex items-center gap-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    {d.icon ? (
                      <span className="text-xl" aria-hidden="true">
                        {d.icon}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold">
                        {d.name.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{d.name}</p>
                    {d.description && (
                      <p className="truncate text-xs text-muted">
                        {d.description}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted">
                      Leader: {d.leader?.full_name ?? 'Unassigned'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      d.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
