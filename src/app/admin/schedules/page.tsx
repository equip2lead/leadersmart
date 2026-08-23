import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { DepartmentPicker, type DepartmentOption } from '../_shared/department-picker';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 50;

type ScheduleRow = {
  id: string;
  service_date: string;
  service_name: string;
  status: 'draft' | 'published';
  department_id: string;
  department: { name: string | null } | { name: string | null }[] | null;
  created_by_user_id: string | null;
  creator: { full_name: string | null } | { full_name: string | null }[] | null;
};

export default async function AdminSchedulesPage({
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

  let q = supabase
    .from('schedules')
    .select(
      `id, service_date, service_name, status, department_id, created_by_user_id,
        department:departments!inner(name, church_id),
        creator:users!created_by_user_id(full_name)`,
    )
    .eq('department.church_id', church.id)
    .order('service_date', { ascending: false })
    .limit(PAGE_LIMIT);
  if (filterDept) q = q.eq('department_id', filterDept);

  const { data } = await q;
  const schedules = (data ?? []) as unknown as ScheduleRow[];

  const nameFrom = <T extends { name: string | null } | { full_name: string | null }>(
    ref: T | T[] | null,
    key: 'name' | 'full_name',
  ): string | null => {
    const r = Array.isArray(ref) ? ref[0] : ref;
    return (r?.[key as keyof T] as unknown as string | null) ?? null;
  };

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('adminAggregate.schedules.title', lang)}
        subtitle={t('adminAggregate.schedules.subtitle', lang)}
      />

      <div className="mt-6 card">
        <DepartmentPicker
          basePath="/admin/schedules"
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
                <th className="px-4 py-3">{t('adminAggregate.col.status', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.createdBy', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                    {formatDate(s.service_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    {nameFrom(s.department, 'name') ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">{s.service_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {t(`sched.status.${s.status}`, lang)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {nameFrom(s.creator, 'full_name') ?? '—'}
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
