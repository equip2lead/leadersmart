import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

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
  const { user, church } = await requireRole(['pastor']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data } = await supabase
    .from('evaluations')
    .select(
      'id, overall_score, overall_recommendation, signed_at, strengths_text, development_areas_text, action_plan_text, pastor_assignment:pastor_assignments!inner(assignment_month, pastor_user_id, church_id)',
    )
    .eq('pastor_assignment.pastor_user_id', user.id)
    .eq('pastor_assignment.church_id', church.id)
    .not('signed_at', 'is', null)
    .order('signed_at', { ascending: false });

  const evaluations = (data ?? []) as unknown as Row[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('pastor.eval.title', lang)}
        subtitle="Signed evaluations are visible here once the senior pastor completes them."
      />

      {evaluations.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
          {t('pastor.evalPendingMsg', lang)}
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
                    Overall score: {e.overall_score?.toFixed(1) ?? '—'} / 5
                  </h3>
                  {e.overall_recommendation && (
                    <span className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-700">
                      {e.overall_recommendation.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              {e.strengths_text && (
                <section className="mt-4">
                  <h4 className="text-sm font-semibold text-ink">Strengths</h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">
                    {e.strengths_text}
                  </p>
                </section>
              )}
              {e.development_areas_text && (
                <section className="mt-3">
                  <h4 className="text-sm font-semibold text-ink">
                    Development areas
                  </h4>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">
                    {e.development_areas_text}
                  </p>
                </section>
              )}
              {e.action_plan_text && (
                <section className="mt-3">
                  <h4 className="text-sm font-semibold text-ink">Action plan</h4>
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
