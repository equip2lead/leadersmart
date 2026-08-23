'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { saveMonthlyReport } from './actions';

const SECTIONS = [
  { key: 'c1', titleKey: 'eval.c1.title' },
  { key: 'c2', titleKey: 'eval.c2.title' },
  { key: 'c3', titleKey: 'eval.c3.title' },
  { key: 'c4', titleKey: 'eval.c4.title' },
  { key: 'c5', titleKey: 'eval.c5.title' },
  { key: 'c6', titleKey: 'eval.c6.title' },
  { key: 'c7', titleKey: 'eval.c7.title' },
  { key: 'c8', titleKey: 'eval.c8.title' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

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
  submitted: boolean;
};

export function MonthlyReportForm({
  assignmentId,
  existingId,
  initial,
  lang,
  canSubmit = true,
}: {
  assignmentId: string;
  existingId: string | null;
  initial: InitialState;
  lang: AppLanguage;
  // False when an admin is drafting on behalf of the assigned pastor —
  // Section 17 says only the assigned pastor signs the final submission.
  canSubmit?: boolean;
}) {
  const router = useRouter();
  const locked = initial.submitted;

  const [sections, setSections] = useState<Record<SectionKey, string>>({
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
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | null>(existingId);
  const isDirty = useRef(false);

  async function persist(submit: boolean): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res = await saveMonthlyReport({
        rowId,
        assignmentId,
        sections,
        recommendations: recommendations || null,
        handoverNotes: handoverNotes || null,
        submit,
      });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      if (!rowId) setRowId(res.id);
      setLastSaved(new Date().toLocaleTimeString());
      isDirty.current = false;
      return true;
    } finally {
      setSaving(false);
    }
  }

  // Auto-save every 15s while dirty and not yet submitted.
  useEffect(() => {
    if (locked) return;
    const interval = setInterval(() => {
      if (isDirty.current && !saving) {
        void persist(false);
      }
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, recommendations, handoverNotes, rowId, saving, locked]);

  function markDirty() {
    isDirty.current = true;
  }

  async function onSubmit() {
    const ok = await persist(true);
    if (ok) {
      router.push('/pastor');
      router.refresh();
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {locked && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t('monthly.locked', lang)}
        </p>
      )}
      {!locked && lastSaved && (
        <p className="text-xs text-muted">
          {t('sunday.savedAt', lang)} {lastSaved}
        </p>
      )}

      {SECTIONS.map((s) => (
        <div key={s.key} className="card">
          <label className="label" htmlFor={s.key}>
            {t(s.titleKey, lang)}
          </label>
          <textarea
            id={s.key}
            rows={4}
            className="input"
            disabled={locked}
            value={sections[s.key]}
            onChange={(e) => {
              setSections((prev) => ({ ...prev, [s.key]: e.target.value }));
              markDirty();
            }}
          />
        </div>
      ))}

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="recs">
            {t('monthly.recommendations', lang)}
          </label>
          <textarea
            id="recs"
            rows={3}
            className="input"
            disabled={locked}
            value={recommendations}
            onChange={(e) => {
              setRecommendations(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div>
          <label className="label" htmlFor="handover">
            {t('monthly.handover', lang)}
          </label>
          <textarea
            id="handover"
            rows={3}
            className="input"
            disabled={locked}
            value={handoverNotes}
            onChange={(e) => {
              setHandoverNotes(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!locked && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void persist(false)}
            disabled={saving}
            className="btn-secondary"
          >
            {t('monthly.saveDraft', lang)}
          </button>
          {canSubmit ? (
            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={saving}
              className="btn-primary"
            >
              {t('monthly.submit', lang)}
            </button>
          ) : (
            <p className="rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:self-center">
              {t('monthly.onlyPastorSubmits', lang)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
