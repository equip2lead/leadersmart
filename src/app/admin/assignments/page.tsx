import Link from 'next/link';
import { Star } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { NewAssignmentForm, type PastorOption } from './_new-form';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 50;

type AssignmentRow = {
  id: string;
  assignment_month: string;
  status: 'upcoming' | 'active' | 'completed';
  pastor: { full_name: string | null } | null;
};

const statusStyles: Record<AssignmentRow['status'], string> = {
  upcoming: 'bg-gray-100 text-gray-700',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-brand-50 text-brand-700',
};

export default async function AssignmentsPage() {
  const { user, church } = await requireRole(['senior_pastor', 'admin']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const [listRes, pastorsRes] = await Promise.all([
    supabase
      .from('pastor_assignments')
      .select('id, assignment_month, status, pastor:users!pastor_user_id(full_name)')
      .eq('church_id', church.id)
      .order('assignment_month', { ascending: false })
      .limit(PAGE_LIMIT),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .eq('role', 'pastor')
      .order('full_name'),
  ]);

  const assignments = (listRes.data ?? []) as unknown as AssignmentRow[];
  const pastors: PastorOption[] = (pastorsRes.data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
  }));
  const hasActive = assignments.some((a) => a.status === 'active');

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('assign.title', lang)}
        subtitle={t('assign.subtitle', lang)}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="text-lg font-semibold text-ink">{t('assign.form.title', lang)}</h2>
          <p className="mt-1 text-xs text-muted">{t('assign.form.helper', lang)}</p>
          <div className="mt-4">
            <NewAssignmentForm pastors={pastors} hasActive={hasActive} lang={lang} />
          </div>
        </div>

        <div className="lg:col-span-2">
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <Star className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
              <p className="mt-4 text-sm text-muted">{t('common.empty', lang)}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">{t('assign.col.month', lang)}</th>
                    <th className="px-4 py-3">{t('assign.col.pastor', lang)}</th>
                    <th className="px-4 py-3">{t('assign.col.status', lang)}</th>
                    <th className="px-4 py-3" aria-label="actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        {a.assignment_month}
                      </td>
                      <td className="px-4 py-3 text-sm text-body">
                        {a.pastor?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[a.status]}`}
                        >
                          {t(`assign.status.${a.status}`, lang)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/assignments/${a.id}/evaluate`}
                          className="text-sm font-medium text-brand-700 hover:underline"
                        >
                          {t('assign.action.evaluate', lang)}
                        </Link>
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
