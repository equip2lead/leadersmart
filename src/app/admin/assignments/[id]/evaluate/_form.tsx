'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage, Evaluation, OverallRecommendation } from '@/lib/types';

// 8 criteria, each with 4 sub-criteria. Data keys are stable (c1_sub1..c8_sub4)
// so historical `ratings` JSONB remains queryable if labels ever change.
const CRITERIA: Array<{ key: string; titleKey: string; subs: Array<{ key: string; labelKey: string }> }> = [
  {
    key: 'c1',
    titleKey: 'eval.c1.title',
    subs: [
      { key: 'c1_sub1', labelKey: 'eval.c1_sub1' },
      { key: 'c1_sub2', labelKey: 'eval.c1_sub2' },
      { key: 'c1_sub3', labelKey: 'eval.c1_sub3' },
      { key: 'c1_sub4', labelKey: 'eval.c1_sub4' },
    ],
  },
  {
    key: 'c2',
    titleKey: 'eval.c2.title',
    subs: [
      { key: 'c2_sub1', labelKey: 'eval.c2_sub1' },
      { key: 'c2_sub2', labelKey: 'eval.c2_sub2' },
      { key: 'c2_sub3', labelKey: 'eval.c2_sub3' },
      { key: 'c2_sub4', labelKey: 'eval.c2_sub4' },
    ],
  },
  {
    key: 'c3',
    titleKey: 'eval.c3.title',
    subs: [
      { key: 'c3_sub1', labelKey: 'eval.c3_sub1' },
      { key: 'c3_sub2', labelKey: 'eval.c3_sub2' },
      { key: 'c3_sub3', labelKey: 'eval.c3_sub3' },
      { key: 'c3_sub4', labelKey: 'eval.c3_sub4' },
    ],
  },
  {
    key: 'c4',
    titleKey: 'eval.c4.title',
    subs: [
      { key: 'c4_sub1', labelKey: 'eval.c4_sub1' },
      { key: 'c4_sub2', labelKey: 'eval.c4_sub2' },
      { key: 'c4_sub3', labelKey: 'eval.c4_sub3' },
      { key: 'c4_sub4', labelKey: 'eval.c4_sub4' },
    ],
  },
  {
    key: 'c5',
    titleKey: 'eval.c5.title',
    subs: [
      { key: 'c5_sub1', labelKey: 'eval.c5_sub1' },
      { key: 'c5_sub2', labelKey: 'eval.c5_sub2' },
      { key: 'c5_sub3', labelKey: 'eval.c5_sub3' },
      { key: 'c5_sub4', labelKey: 'eval.c5_sub4' },
    ],
  },
  {
    key: 'c6',
    titleKey: 'eval.c6.title',
    subs: [
      { key: 'c6_sub1', labelKey: 'eval.c6_sub1' },
      { key: 'c6_sub2', labelKey: 'eval.c6_sub2' },
      { key: 'c6_sub3', labelKey: 'eval.c6_sub3' },
      { key: 'c6_sub4', labelKey: 'eval.c6_sub4' },
    ],
  },
  {
    key: 'c7',
    titleKey: 'eval.c7.title',
    subs: [
      { key: 'c7_sub1', labelKey: 'eval.c7_sub1' },
      { key: 'c7_sub2', labelKey: 'eval.c7_sub2' },
      { key: 'c7_sub3', labelKey: 'eval.c7_sub3' },
      { key: 'c7_sub4', labelKey: 'eval.c7_sub4' },
    ],
  },
  {
    key: 'c8',
    titleKey: 'eval.c8.title',
    subs: [
      { key: 'c8_sub1', labelKey: 'eval.c8_sub1' },
      { key: 'c8_sub2', labelKey: 'eval.c8_sub2' },
      { key: 'c8_sub3', labelKey: 'eval.c8_sub3' },
      { key: 'c8_sub4', labelKey: 'eval.c8_sub4' },
    ],
  },
];

const RECOMMENDATIONS: Array<{ value: OverallRecommendation; labelKey: string }> = [
  { value: 'excellent', labelKey: 'eval.rec.excellent' },
  { value: 'good', labelKey: 'eval.rec.good' },
  { value: 'needs_improvement', labelKey: 'eval.rec.needsImprovement' },
];

type Ratings = Record<string, number>;
type Comments = Record<string, string>;

export function EvaluationForm({
  assignmentId,
  evaluatorId,
  existing,
  lang,
}: {
  assignmentId: string;
  evaluatorId: string;
  existing: Evaluation | null;
  lang: AppLanguage;
}) {
  const router = useRouter();
  const alreadySigned = !!existing?.signed_at;

  const [ratings, setRatings] = useState<Ratings>(
    (existing?.ratings as Ratings | undefined) ?? {},
  );
  const [comments, setComments] = useState<Comments>(
    (existing?.criterion_comments as Comments | undefined) ?? {},
  );
  const [strengths, setStrengths] = useState(existing?.strengths_text ?? '');
  const [development, setDevelopment] = useState(
    existing?.development_areas_text ?? '',
  );
  const [actionPlan, setActionPlan] = useState(existing?.action_plan_text ?? '');
  const [recommendation, setRecommendation] = useState<OverallRecommendation | ''>(
    existing?.overall_recommendation ?? '',
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(sign: boolean, e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const payload: Partial<Evaluation> = {
        pastor_assignment_id: assignmentId,
        evaluator_user_id: evaluatorId,
        ratings: ratings as unknown as Record<string, number>,
        criterion_comments: comments as unknown as Record<string, string>,
        strengths_text: strengths || null,
        development_areas_text: development || null,
        action_plan_text: actionPlan || null,
        overall_recommendation: recommendation || null,
        signed_at: sign ? new Date().toISOString() : null,
      };
      const { error: upsertError } = existing
        ? await supabase.from('evaluations').update(payload).eq('id', existing.id)
        : await supabase.from('evaluations').insert(payload);

      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      router.push('/admin/assignments');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-6 space-y-6" onSubmit={(e) => save(false, e)}>
      {alreadySigned && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t('eval.signed.notice', lang)}
        </p>
      )}

      <div className="card">
        <p className="text-sm font-medium text-ink">{t('eval.bands.title', lang)}</p>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          <li>{t('eval.band.outstanding', lang)}</li>
          <li>{t('eval.band.exceeds', lang)}</li>
          <li>{t('eval.band.meets', lang)}</li>
          <li>{t('eval.band.needs', lang)}</li>
          <li>{t('eval.band.unsatisfactory', lang)}</li>
        </ul>
        <p className="mt-3 text-xs text-muted">{t('eval.scale.hint', lang)}</p>
      </div>

      {CRITERIA.map((c) => (
        <fieldset key={c.key} className="card">
          <legend className="text-base font-semibold text-ink">{t(c.titleKey, lang)}</legend>
          <div className="mt-4 space-y-4">
            {c.subs.map((sub) => {
              const value = ratings[sub.key] ?? 0;
              return (
                <div key={sub.key}>
                  <p className="text-sm text-body">{t(sub.labelKey, lang)}</p>
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={alreadySigned}
                        onClick={() =>
                          setRatings((r) => ({ ...r, [sub.key]: n }))
                        }
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                          value === n
                            ? 'border-brand-700 bg-brand-700 text-white'
                            : 'border-gray-200 bg-white text-body hover:border-brand-500'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                        aria-label={`${t('eval.rate', lang)} ${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div>
              <label className="label">{t('eval.comments.label', lang)}</label>
              <textarea
                disabled={alreadySigned}
                rows={2}
                className="input"
                value={comments[c.key] ?? ''}
                onChange={(e) =>
                  setComments((prev) => ({ ...prev, [c.key]: e.target.value }))
                }
              />
            </div>
          </div>
        </fieldset>
      ))}

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="strengths">
            {t('eval.strengths', lang)}
          </label>
          <textarea
            id="strengths"
            rows={3}
            className="input"
            disabled={alreadySigned}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="development">
            {t('eval.development', lang)}
          </label>
          <textarea
            id="development"
            rows={3}
            className="input"
            disabled={alreadySigned}
            value={development}
            onChange={(e) => setDevelopment(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="action">
            {t('eval.action', lang)}
          </label>
          <textarea
            id="action"
            rows={3}
            className="input"
            disabled={alreadySigned}
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="recommendation">
            {t('eval.overallRec', lang)}
          </label>
          <select
            id="recommendation"
            className="input"
            disabled={alreadySigned}
            value={recommendation}
            onChange={(e) =>
              setRecommendation(e.target.value as OverallRecommendation)
            }
          >
            <option value="">{t('eval.select', lang)}</option>
            {RECOMMENDATIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.labelKey, lang)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!alreadySigned && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="btn-secondary"
          >
            {t('eval.saveDraft', lang)}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="btn-primary"
          >
            {t('eval.sign', lang)}
          </button>
        </div>
      )}
    </form>
  );
}
