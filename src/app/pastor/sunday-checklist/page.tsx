import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { ChecklistForm } from './_form';
import { loadPastorPageContext } from '../_context';

export const dynamic = 'force-dynamic';

function mostRecentSunday(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export default async function SundayChecklistPage() {
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  const lang = user.preferred_language;
  const supabase = await createClient();
  const ctx = await loadPastorPageContext(user, church.id);

  if (ctx.kind === 'no_active') {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('pastor.sunday.title', lang)}
          subtitle={t('pastor.noActiveAssignment', lang)}
        />
        <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-muted">
          <Link href="/admin/assignments" className="text-indigo-royal-700 hover:underline">
            {t('pastor.setAssignmentLink', lang)}
          </Link>
        </p>
      </div>
    );
  }

  const serviceDate = mostRecentSunday();

  const [existingRes, historyRes] = await Promise.all([
    supabase
      .from('sunday_checklists')
      .select('*')
      .eq('pastor_assignment_id', ctx.assignmentId)
      .eq('service_date', serviceDate)
      .maybeSingle(),
    // History includes the submitter join so we can render on-behalf-of.
    supabase
      .from('sunday_checklists')
      .select(
        `id, service_date, is_draft, submitted_at, attendance_count, new_visitors_count,
          submitted_by_user_id,
          submitter:users!submitted_by_user_id(full_name)`,
      )
      .eq('pastor_assignment_id', ctx.assignmentId)
      .order('service_date', { ascending: false })
      .limit(12),
  ]);

  const existing = existingRes.data;
  type HistoryRow = {
    id: string;
    service_date: string;
    is_draft: boolean;
    submitted_at: string | null;
    attendance_count: number | null;
    new_visitors_count: number | null;
    submitted_by_user_id: string | null;
    submitter: { full_name: string | null } | { full_name: string | null }[] | null;
  };
  const history = (historyRes.data ?? []) as HistoryRow[];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');

  const submitterName = (row: HistoryRow): string | null => {
    const ref = row.submitter;
    const r = Array.isArray(ref) ? ref[0] : ref;
    return r?.full_name ?? null;
  };

  const attributionLabel = (row: HistoryRow): string => {
    const submitter = submitterName(row);
    if (!submitter) return ctx.pastorName || t('audit.actorUnknown', lang);
    if (row.submitted_by_user_id === ctx.pastorUserId) return submitter;
    return t('attribution.onBehalfOf', lang)
      .replace('{submitter}', submitter)
      .replace('{pastor}', ctx.pastorName);
  };

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={
          ctx.isOnBehalf
            ? t('pastor.sunday.onBehalfTitle', lang).replace('{name}', ctx.pastorName)
            : t('pastor.sunday.title', lang)
        }
        subtitle={`${t('pastor.potm', lang)} — ${ctx.assignmentMonth} · ${t(
          'sunday.serviceDate',
          lang,
        )}: ${formatDate(serviceDate)}`}
      />

      {ctx.isOnBehalf && (
        <div className="mt-4 rounded-lg bg-indigo-royal-50 px-4 py-3 text-sm text-indigo-royal-800">
          {t('pastor.sunday.onBehalfBanner', lang).replace('{name}', ctx.pastorName)}
        </div>
      )}

      <ChecklistForm
        assignmentId={ctx.assignmentId}
        serviceDate={serviceDate}
        existingId={existing?.id ?? null}
        initialItems={(existing?.items_checked as Record<string, boolean> | undefined) ?? {}}
        initialAttendance={existing?.attendance_count ?? null}
        initialOffering={existing?.offering_total ?? null}
        initialVisitors={existing?.new_visitors_count ?? null}
        initialIssues={existing?.issues_text ?? ''}
        lang={lang}
        submitLabelOverride={
          ctx.isOnBehalf
            ? t('sunday.submitOnBehalf', lang).replace('{name}', ctx.pastorName)
            : null
        }
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">
          {t('sunday.history.title', lang)}
        </h2>
        {history.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-muted">
            {t('sunday.history.empty', lang)}
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">{t('sunday.history.col.date', lang)}</th>
                  <th className="px-4 py-3">{t('sunday.history.col.status', lang)}</th>
                  <th className="px-4 py-3">{t('sunday.attendance', lang)}</th>
                  <th className="px-4 py-3">{t('sunday.visitors', lang)}</th>
                  <th className="px-4 py-3">{t('attribution.col.submittedBy', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h) => {
                  const isSubmitted = !h.is_draft && h.submitted_at;
                  return (
                    <tr key={h.id}>
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        {formatDate(h.service_date)}
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
                      <td className="px-4 py-3 text-sm text-body">
                        {h.attendance_count ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-body">
                        {h.new_visitors_count ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {attributionLabel(h)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          <Link href="/pastor" className="hover:underline">
            ← {t('common.back', lang)}
          </Link>
        </p>
      </section>
    </div>
  );
}
