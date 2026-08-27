import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { loadPastorPageContext } from '../_context';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  overall_score: number | null;
  overall_recommendation: 'excellent' | 'good' | 'needs_improvement' | null;
  signed_at: string | null;
  pastor_assignment: { assignment_month: string } | null;
  strengths_text: string | null;
  development_areas_text: string | null;
  action_plan_text: string | null;
};

export default async function MyEvaluationsPage() {
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  const lang = user.preferred_language;
  const supabase = await createClient();
  const ctx = await loadPastorPageContext(user, church.id);

  if (ctx.kind === 'no_active') {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('pastor.eval.title', lang)}
          subtitle={t('pastor.noActiveAssignment', lang)}
        />
      </div>
    );
  }

  // Evaluations page always shows the assigned PoM's signed evaluations.
  // Admins see the current PoM's history; the assigned pastor sees their own.
  const { data } = await supabase
    .from('evaluations')
    .select(
      'id, overall_score, overall_recommendation, signed_at, strengths_text, development_areas_text, action_plan_text, pastor_assignment:pastor_assignments!inner(assignment_month, pastor_user_id, church_id)',
    )
    .eq('pastor_assignment.pastor_user_id', ctx.pastorUserId)
    .eq('pastor_assignment.church_id', church.id)
    .not('signed_at', 'is', null)
    .order('signed_at', { ascending: false });

  const evaluations = (data ?? []) as unknown as Row[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={
          ctx.isOnBehalf
            ? t('pastor.eval.onBehalfTitle', lang).replace('{name}', ctx.pastorName)
            : t('pastor.eval.title', lang)
        }
        subtitle={t('pastor.eval.subtitle', lang)}
      />

      {evaluations.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
          {t('pastor.evalPendingMsg', lang)}
          {ctx.isOnBehalf && (
            <p className="mt-3">
              <Link
                href="/admin/assignments"
                className="text-indigo-royal-700 hover:underline"
              >
                {t('pastor.eval.evaluateLink', lang)}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {evaluations.map((e) => (
            <article key={e.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">
                    {e.pastor_assignment?.assignment_month ?? '—'}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">
                    {t('pastor.eval.overallScore', lang)}: {e.overall_score?.toFixed(1) ?? '—'} / 5
                  </h3>
                  {e.overall_recommendation && (
                    <span className="mt-2 inline-flex rounded-full bg-indigo-royal-50 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-royal-700">
                      {t(`eval.rec.${e.overall_recommendation === 'needs_improvement' ? 'needsImprovement' : e.overall_recommendation}`, lang)}
                    </span>
                  )}
                </div>
              </div>
              {e.strengths_text && (
                <section className="mt-4">
                  <h4 className="text-sm font-semibold text-ink">{t('eval.strengths', lang)}</h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">
                    {e.strengths_text}
                  </p>
                </section>
              )}
              {e.development_areas_text && (
                <section className="mt-3">
                  <h4 className="text-sm font-semibold text-ink">
                    {t('eval.development', lang)}
                  </h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">
                    {e.development_areas_text}
                  </p>
                </section>
              )}
              {e.action_plan_text && (
                <section className="mt-3">
                  <h4 className="text-sm font-semibold text-ink">{t('eval.action', lang)}</h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">
                    {e.action_plan_text}
                  </p>
                </section>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
