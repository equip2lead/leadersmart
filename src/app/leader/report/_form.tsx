'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { saveWeeklyReport } from './actions';

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
  initial,
  suggestedShowed,
  suggestedAbsent,
  hasAttendance,
  lang,
}: {
  departmentId: string;
  weekStart: string;
  existingId: string | null;
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function save(submit: boolean) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await saveWeeklyReport({
        rowId,
        departmentId,
        weekStart,
        showedUpCount: showedUp === '' ? null : Number(showedUp),
        absentCount: absent === '' ? null : Number(absent),
        wentWellText: wentWell || null,
        wentWrongText: wentWrong || null,
        helpNeededText: helpNeeded || null,
        submit,
      });
      if (!res.ok) {
        setError(errorMessage(res.error, lang));
        return;
      }
      if (!rowId) setRowId(res.id);
      if (submit) {
        router.push('/leader');
        router.refresh();
      } else {
        setNotice(t('report.savedNotice', lang));
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {hasAttendance && (
        <p className="rounded-lg bg-indigo-royal-50 px-4 py-3 text-sm text-indigo-royal-800">
          {t('report.autofillNotice', lang)}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
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
          onClick={() => save(false)}
          disabled={pending}
          className="btn-secondary"
        >
          {t('report.saveDraft', lang)}
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={pending}
          className="btn-primary"
        >
          {t('report.submit', lang)}
        </button>
      </div>
    </div>
  );
}

function errorMessage(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'unauthorized':
      return t('team.error.unauthorized', lang);
    case 'invalid_week_start':
      return t('report.error.invalidWeek', lang);
    default:
      return code;
  }
}
