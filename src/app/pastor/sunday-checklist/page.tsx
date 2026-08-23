import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { ChecklistForm } from './_form';

export const dynamic = 'force-dynamic';

// Most recent Sunday (or today, if today IS Sunday) as YYYY-MM-DD (UTC-based).
function mostRecentSunday(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export default async function SundayChecklistPage() {
  const { user, church } = await requireRole(['pastor']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data: active } = await supabase
    .from('pastor_assignments')
    .select('id, assignment_month')
    .eq('church_id', church.id)
    .eq('pastor_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!active) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('pastor.sunday.title', lang)}
          subtitle={t('pastor.notAssigned', lang)}
        />
      </div>
    );
  }

  const serviceDate = mostRecentSunday();

  const [existingRes, historyRes] = await Promise.all([
    supabase
      .from('sunday_checklists')
      .select('*')
      .eq('pastor_assignment_id', active.id)
      .eq('service_date', serviceDate)
      .maybeSingle(),
    supabase
      .from('sunday_checklists')
      .select('id, service_date, is_draft, submitted_at, attendance_count, new_visitors_count')
      .eq('pastor_assignment_id', active.id)
      .order('service_date', { ascending: false })
      .limit(12),
  ]);

  const existing = existingRes.data;
  const history = historyRes.data ?? [];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('pastor.sunday.title', lang)}
        subtitle={`${t('pastor.potm', lang)} — ${active.assignment_month} · ${t(
          'sunday.serviceDate',
          lang,
        )}: ${formatDate(serviceDate)}`}
      />

      <ChecklistForm
        assignmentId={active.id}
        serviceDate={serviceDate}
        existingId={existing?.id ?? null}
        initialItems={(existing?.items_checked as Record<string, boolean> | undefined) ?? {}}
        initialAttendance={existing?.attendance_count ?? null}
        initialOffering={existing?.offering_total ?? null}
        initialVisitors={existing?.new_visitors_count ?? null}
        initialIssues={existing?.issues_text ?? ''}
        lang={lang}
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
