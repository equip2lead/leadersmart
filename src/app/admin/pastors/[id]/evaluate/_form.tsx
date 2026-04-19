'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Evaluation, OverallRecommendation } from '@/lib/types';

// 8 criteria from the LeaderSmart brief. Each has 4 sub-criteria.
// Sub-criteria labels are placeholders until the project specification is shared —
// they should be replaced with the exact wording from the spec doc.
const CRITERIA: Array<{ key: string; title: string; subs: string[] }> = [
  {
    key: 'c1',
    title: 'Leadership and Team Management',
    subs: [
      'Delegation and empowerment',
      'Team morale and conflict resolution',
      'Meeting quality and follow-through',
      'Consistency of direction',
    ],
  },
  {
    key: 'c2',
    title: 'Relationship with Senior Leadership',
    subs: [
      'Communication cadence',
      'Receiving feedback',
      'Alignment with church vision',
      'Respect for authority',
    ],
  },
  {
    key: 'c3',
    title: 'Department Oversight',
    subs: [
      'Coverage of departments',
      'Quality of on-site presence',
      'Addressing issues promptly',
      'Building department leaders',
    ],
  },
  {
    key: 'c4',
    title: 'Spiritual Follow-Up',
    subs: [
      'Care for members in need',
      'Prayer and visitation',
      'Discipleship focus',
      'Pastoral sensitivity',
    ],
  },
  {
    key: 'c5',
    title: 'Communication and Transparency',
    subs: [
      'Clarity of announcements',
      'Timeliness of updates',
      'Honesty and openness',
      'Handling of concerns',
    ],
  },
  {
    key: 'c6',
    title: 'Organization of Services',
    subs: [
      'Service flow',
      'Preparation quality',
      'Punctuality',
      'Congregation experience',
    ],
  },
  {
    key: 'c7',
    title: 'Evangelism and Community Impact',
    subs: [
      'Outreach activity',
      'New visitors engaged',
      'Community partnerships',
      'Follow-up with visitors',
    ],
  },
  {
    key: 'c8',
    title: 'Final Report Clarity',
    subs: [
      'Completeness of report',
      'Quality of financial summary',
      'Handover notes',
      'Supporting documentation',
    ],
  },
];

const RECOMMENDATIONS: Array<{ value: OverallRecommendation; label: string }> = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'needs_improvement', label: 'Needs improvement' },
];

type Ratings = Record<string, number>;
type Comments = Record<string, string>;

function subKey(criterionKey: string, subIndex: number) {
  return `${criterionKey}.${subIndex + 1}`;
}

export function EvaluationForm({
  assignmentId,
  evaluatorId,
  existing,
}: {
  assignmentId: string;
  evaluatorId: string;
  existing: Evaluation | null;
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

      router.push('/admin/pastors');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-6 space-y-6" onSubmit={(e) => save(false, e)}>
      {alreadySigned && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          This evaluation is signed and visible to the pastor.
        </p>
      )}

      {CRITERIA.map((c) => (
        <fieldset key={c.key} className="card">
          <legend className="text-base font-semibold text-ink">{c.title}</legend>
          <div className="mt-4 space-y-4">
            {c.subs.map((label, idx) => {
              const key = subKey(c.key, idx);
              const value = ratings[key] ?? 0;
              return (
                <div key={key}>
                  <p className="text-sm text-body">{label}</p>
                  <div className="mt-2 flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={alreadySigned}
                        onClick={() =>
                          setRatings((r) => ({ ...r, [key]: n }))
                        }
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                          value === n
                            ? 'border-brand-700 bg-brand-700 text-white'
                            : 'border-gray-200 bg-white text-body hover:border-brand-500'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                        aria-label={`Rate ${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div>
              <label className="label">Comments for {c.title}</label>
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
            Strengths
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
            Development areas
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
            Action plan
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
            Overall recommendation
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
            <option value="">— Select —</option>
            {RECOMMENDATIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
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
            Save draft
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="btn-primary"
          >
            Sign &amp; submit
          </button>
        </div>
      )}
    </form>
  );
}
