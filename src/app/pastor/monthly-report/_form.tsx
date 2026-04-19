'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SECTIONS = [
  { key: 'c1', title: 'Leadership and Team Management' },
  { key: 'c2', title: 'Relationship with Senior Leadership' },
  { key: 'c3', title: 'Department Oversight' },
  { key: 'c4', title: 'Spiritual Follow-Up' },
  { key: 'c5', title: 'Communication and Transparency' },
  { key: 'c6', title: 'Organization of Services' },
  { key: 'c7', title: 'Evangelism and Community Impact' },
  { key: 'c8', title: 'Final Report Clarity' },
] as const;

type InitialState = {
  c1: Record<string, string>;
  c2: Record<string, string>;
  c3: Record<string, string>;
  c4: Record<string, string>;
  c5: Record<string, string>;
  c6: Record<string, string>;
  c7: Record<string, string>;
  c8: Record<string, string>;
  recommendations: string;
  handoverNotes: string;
};

export function MonthlyReportForm({
  assignmentId,
  existingId,
  initial,
}: {
  assignmentId: string;
  existingId: string | null;
  initial: InitialState;
}) {
  const router = useRouter();
  const [sections, setSections] = useState<Record<string, string>>({
    c1: initial.c1.narrative ?? '',
    c2: initial.c2.narrative ?? '',
    c3: initial.c3.narrative ?? '',
    c4: initial.c4.narrative ?? '',
    c5: initial.c5.narrative ?? '',
    c6: initial.c6.narrative ?? '',
    c7: initial.c7.narrative ?? '',
    c8: initial.c8.narrative ?? '',
  });
  const [recommendations, setRecommendations] = useState(initial.recommendations);
  const [handoverNotes, setHandoverNotes] = useState(initial.handoverNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(existingId);

  async function save(submit: boolean) {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        pastor_assignment_id: assignmentId,
        criterion_1_data: { narrative: sections.c1 },
        criterion_2_data: { narrative: sections.c2 },
        criterion_3_data: { narrative: sections.c3 },
        criterion_4_data: { narrative: sections.c4 },
        criterion_5_data: { narrative: sections.c5 },
        criterion_6_data: { narrative: sections.c6 },
        criterion_7_data: { narrative: sections.c7 },
        criterion_8_data: { narrative: sections.c8 },
        recommendations: recommendations || null,
        handover_notes: handoverNotes || null,
        is_draft: !submit,
        submitted_at: submit ? new Date().toISOString() : null,
      };

      if (rowId) {
        const { error: updErr } = await supabase
          .from('monthly_reports')
          .update(payload)
          .eq('id', rowId);
        if (updErr) {
          setError(updErr.message);
          return false;
        }
      } else {
        const { data, error: insErr } = await supabase
          .from('monthly_reports')
          .insert(payload)
          .select('id')
          .single();
        if (insErr || !data) {
          setError(insErr?.message ?? 'Save failed');
          return false;
        }
        setRowId(data.id);
      }

      if (submit) {
        router.push('/pastor');
        router.refresh();
      }
      return true;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {SECTIONS.map((s) => (
        <div key={s.key} className="card">
          <label className="label" htmlFor={s.key}>
            {s.title}
          </label>
          <textarea
            id={s.key}
            rows={4}
            className="input"
            value={sections[s.key]}
            onChange={(e) =>
              setSections((prev) => ({ ...prev, [s.key]: e.target.value }))
            }
          />
        </div>
      ))}

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="recs">
            Recommendations
          </label>
          <textarea
            id="recs"
            rows={3}
            className="input"
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="handover">
            Handover notes
          </label>
          <textarea
            id="handover"
            rows={3}
            className="input"
            value={handoverNotes}
            onChange={(e) => setHandoverNotes(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={saving}
          className="btn-secondary"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={saving}
          className="btn-primary"
        >
          Submit report
        </button>
      </div>
    </div>
  );
}
