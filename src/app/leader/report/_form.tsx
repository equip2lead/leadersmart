'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

type Initial = {
  showed_up_count: number | null;
  absent_count: number | null;
  went_well_text: string | null;
  went_wrong_text: string | null;
  help_needed_text: string | null;
};

export function WeeklyReportForm({
  departmentId,
  weekStart,
  existingId,
  userId,
  initial,
  suggestedShowed,
  suggestedAbsent,
  hasAttendance,
  lang,
}: {
  departmentId: string;
  weekStart: string;
  existingId: string | null;
  userId: string;
  initial: Initial | null;
  suggestedShowed: number;
  suggestedAbsent: number;
  hasAttendance: boolean;
  lang: AppLanguage;
}) {
  const router = useRouter();
  const [showedUp, setShowedUp] = useState<string>(
    initial?.showed_up_count !== null && initial?.showed_up_count !== undefined
      ? String(initial.showed_up_count)
      : String(suggestedShowed),
  );
  const [absent, setAbsent] = useState<string>(
    initial?.absent_count !== null && initial?.absent_count !== undefined
      ? String(initial.absent_count)
      : String(suggestedAbsent),
  );
  const [wentWell, setWentWell] = useState<string>(initial?.went_well_text ?? '');
  const [wentWrong, setWentWrong] = useState<string>(initial?.went_wrong_text ?? '');
  const [helpNeeded, setHelpNeeded] = useState<string>(initial?.help_needed_text ?? '');

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
        showed_up_count: showedUp === '' ? null : Number(showedUp),
        absent_count: absent === '' ? null : Number(absent),
        went_well_text: wentWell || null,
        went_wrong_text: wentWrong || null,
        help_needed_text: helpNeeded || null,
        submitted_by_user_id: submit ? userId : null,
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
      {hasAttendance && (
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {t('report.autofillNotice', lang)}
        </p>
      )}

      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="showed">
            {t('report.q1.label', lang)}
          </label>
          <input
            id="showed"
            type="number"
            min={0}
            className="input"
            value={showedUp}
            onChange={(e) => setShowedUp(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">{t('report.q1.hint', lang)}</p>
        </div>
        <div>
          <label className="label" htmlFor="absent">
            {t('report.q2.label', lang)}
          </label>
          <input
            id="absent"
            type="number"
            min={0}
            className="input"
            value={absent}
            onChange={(e) => setAbsent(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">{t('report.q2.hint', lang)}</p>
        </div>
      </div>

      <div className="card">
        <label className="label" htmlFor="went_well">
          {t('report.q3.label', lang)}
        </label>
        <textarea
          id="went_well"
          rows={3}
          className="input"
          value={wentWell}
          onChange={(e) => setWentWell(e.target.value)}
        />
      </div>

      <div className="card">
        <label className="label" htmlFor="went_wrong">
          {t('report.q4.label', lang)}
        </label>
        <textarea
          id="went_wrong"
          rows={3}
          className="input"
          value={wentWrong}
          onChange={(e) => setWentWrong(e.target.value)}
        />
      </div>

      <div className="card">
        <label className="label" htmlFor="help_needed">
          {t('report.q5.label', lang)}
        </label>
        <textarea
          id="help_needed"
          rows={3}
          className="input"
          value={helpNeeded}
          onChange={(e) => setHelpNeeded(e.target.value)}
        />
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
          {t('report.saveDraft', lang)}
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={saving}
          className="btn-primary"
        >
          {t('report.submit', lang)}
        </button>
      </div>
    </div>
  );
}
