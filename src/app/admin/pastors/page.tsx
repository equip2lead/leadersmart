import Link from 'next/link';
import { Star } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

export const dynamic = 'force-dynamic';

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

export default async function PastorsPage() {
  const { user, church } = await requireRole(['senior_pastor', 'admin']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data } = await supabase
    .from('pastor_assignments')
    .select('id, assignment_month, status, pastor:users!pastor_user_id(full_name)')
    .eq('church_id', church.id)
    .order('assignment_month', { ascending: false });

  const assignments = (data ?? []) as unknown as AssignmentRow[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('admin.pastors.title', lang)}
        subtitle="Assign and track Pastor of the Month rotations."
      />

      {assignments.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <Star
            className="mx-auto h-10 w-10 text-muted"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-muted">
            {t('common.empty', lang)}
          </p>
          <p className="mt-2 text-xs text-muted">
            Assignment creation UI is available once the pastor spec is finalized.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Pastor</th>
                <th className="px-4 py-3">Status</th>
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
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[a.status]}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/pastors/${a.id}/evaluate`}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      Evaluate
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
