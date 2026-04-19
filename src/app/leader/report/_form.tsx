'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const QUESTIONS: Array<{ key: string; prompt: string }> = [
  { key: 'wins', prompt: 'What went well this week?' },
  { key: 'challenges', prompt: 'What challenges did your team face?' },
  { key: 'attendance_notes', prompt: 'Notes on attendance or absences' },
  { key: 'prayer_requests', prompt: 'Prayer requests from the team' },
  { key: 'next_week_focus', prompt: 'What is your focus for next week?' },
];

type Existing = Record<string, unknown> | null;

export function WeeklyReportForm({
  departmentId,
  weekStart,
  existingId,
  initial,
}: {
  departmentId: string;
  weekStart: string;
  existingId: string | null;
  initial: Existing;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({
    wins: (initial?.wins_text as string | undefined) ?? '',
    challenges: (initial?.challenges_text as string | undefined) ?? '',
    attendance_notes: (initial?.attendance_notes as string | undefined) ?? '',
    prayer_requests: (initial?.prayer_requests as string | undefined) ?? '',
    next_week_focus: (initial?.next_week_focus as string | undefined) ?? '',
  });
  const [rowId, setRowId] = useState<string | null>(existingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(submit: boolean) {
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        department_id: departmentId,
        week_start_date: weekStart,
        wins_text: answers.wins || null,
        challenges_text: answers.challenges || null,
        attendance_notes: answers.attendance_notes || null,
        prayer_requests: answers.prayer_requests || null,
        next_week_focus: answers.next_week_focus || null,
        is_draft: !submit,
        submitted_at: submit ? new Date().toISOString() : null,
      };

      if (rowId) {
        const { error: updErr } = await supabase
          .from('department_weekly_reports')
          .update(payload)
          .eq('id', rowId);
        if (updErr) {
          setError(updErr.message);
          return;
        }
      } else {
        const { data, error: insErr } = await supabase
          .from('department_weekly_reports')
          .insert(payload)
          .select('id')
          .single();
        if (insErr || !data) {
          setError(insErr?.message ?? 'Save failed');
          return;
        }
        setRowId(data.id);
      }

      if (submit) {
        router.push('/leader');
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {QUESTIONS.map((q) => (
        <div key={q.key} className="card">
          <label className="label" htmlFor={q.key}>
            {q.prompt}
          </label>
          <textarea
            id={q.key}
            rows={3}
            className="input"
            value={answers[q.key]}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
            }
          />
        </div>
      ))}

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
