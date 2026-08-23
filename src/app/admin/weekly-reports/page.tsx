import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { DepartmentPicker, type DepartmentOption } from '../_shared/department-picker';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 100;

type ReportRow = {
  id: string;
  week_start_date: string;
  showed_up_count: number | null;
  absent_count: number | null;
  submitted_at: string | null;
  submitted_by_user_id: string | null;
  department_id: string;
  department: { name: string | null; leader_user_id: string | null } | { name: string | null; leader_user_id: string | null }[] | null;
  submitter: { full_name: string | null } | { full_name: string | null }[] | null;
};

export default async function AdminWeeklyReportsPage({
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
    .select('id, name, leader_user_id, leader:users!leader_user_id(full_name)')
    .eq('church_id', church.id)
    .eq('is_active', true)
    .order('display_order');

  const deptOptions: DepartmentOption[] = (depts ?? []).map((d) => ({
    id: d.id,
    name: d.name,
  }));

  type DeptRef = {
    id: string;
    leader_user_id: string | null;
    leader: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const deptLeaderNameById: Record<string, string | null> = {};
  for (const d of (depts as unknown as DeptRef[]) ?? []) {
    const ref = d.leader;
    const r = Array.isArray(ref) ? ref[0] : ref;
    deptLeaderNameById[d.id] = r?.full_name ?? null;
  }

  let q = supabase
    .from('department_weekly_reports')
    .select(
      `id, week_start_date, showed_up_count, absent_count, submitted_at, submitted_by_user_id, department_id,
        department:departments!inner(name, leader_user_id, church_id),
        submitter:users!submitted_by_user_id(full_name)`,
    )
    .eq('department.church_id', church.id)
    .order('week_start_date', { ascending: false })
    .limit(PAGE_LIMIT);
  if (filterDept) q = q.eq('department_id', filterDept);

  const { data } = await q;
  const reports = (data ?? []) as unknown as ReportRow[];

  const nameFrom = <T extends Record<string, unknown>>(
    ref: T | T[] | null,
    key: keyof T,
  ): string | null => {
    const r = Array.isArray(ref) ? ref[0] : ref;
    return (r?.[key] as string | null) ?? null;
  };

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('adminAggregate.reports.title', lang)}
        subtitle={t('adminAggregate.reports.subtitle', lang)}
      />

      <div className="mt-6 card">
        <DepartmentPicker
          basePath="/admin/weekly-reports"
          selectedId={filterDept}
          options={deptOptions}
          lang={lang}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {reports.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">
            {t('adminAggregate.emptyForFilter', lang)}
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{t('adminAggregate.col.weekStart', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.department', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.showed', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.absent', lang)}</th>
                <th className="px-4 py-3">{t('adminAggregate.col.status', lang)}</th>
                <th className="px-4 py-3">{t('attribution.col.submittedBy', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => {
                const submitterName = nameFrom(r.submitter, 'full_name');
                const deptLeaderName = deptLeaderNameById[r.department_id];
                const isSubmitted = !!r.submitted_at;
                // On-behalf-of when submitter differs from the department's
                // primary leader.
                const isOnBehalf =
                  isSubmitted &&
                  submitterName != null &&
                  deptLeaderName != null &&
                  submitterName !== deptLeaderName;
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                      {formatDate(r.week_start_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-body">
                      {nameFrom(r.department, 'name') ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-700">
                      {r.showed_up_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-700">
                      {r.absent_count ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isSubmitted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isSubmitted
                          ? t('common.submitted', lang)
                          : t('common.draft', lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {submitterName
                        ? isOnBehalf
                          ? t('attribution.onBehalfOf', lang)
                              .replace('{submitter}', submitterName)
                              .replace('{pastor}', deptLeaderName ?? '—')
                          : submitterName
                        : '—'}
                    </td>
                  </tr>
                );
              })}
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
