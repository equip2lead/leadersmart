'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import {
  REPORT_SECTIONS,
  REPORT_SECTION_MAX,
  REPORT_SECTION_WARN,
} from '@/lib/types';
import type { AppLanguage, ReportSection } from '@/lib/types';
import {
  createReport,
  submitReport,
  updateReportDraft,
  type ReportSections,
} from './actions';

const LABELS: Record<ReportSection, { label: string; placeholder: string }> = {
  activities: {
    label: 'reports.form.activities_label',
    placeholder: 'reports.form.activities_placeholder',
  },
  leadership_updates: {
    label: 'reports.form.leadership_label',
    placeholder: 'reports.form.leadership_placeholder',
  },
  wins: {
    label: 'reports.form.wins_label',
    placeholder: 'reports.form.wins_placeholder',
  },
  challenges: {
    label: 'reports.form.challenges_label',
    placeholder: 'reports.form.challenges_placeholder',
  },
  prayer_requests: {
    label: 'reports.form.prayer_label',
    placeholder: 'reports.form.prayer_placeholder',
  },
};

function mapError(code: string, lang: AppLanguage): string {
  const key = `reports.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

export function ReportForm({
  lang,
  branchId,
  months,
  existing,
}: {
  lang: AppLanguage;
  branchId: string;
  /** [isoMonth, label] pairs the branch may still file. */
  months: Array<{ value: string; label: string }>;
  /** Set when editing an existing draft or a sent-back report. */
  existing?: { id: string; month: string; sections: ReportSections };
}) {
  const router = useRouter();
  const [month, setMonth] = useState(existing?.month ?? months[0]?.value ?? '');
  const [sections, setSections] = useState<ReportSections>(
    existing?.sections ?? {
      activities: '',
      leadership_updates: '',
      wins: '',
      challenges: '',
      prayer_requests: '',
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allFilled = REPORT_SECTIONS.every((k) => sections[k].trim().length > 0);

  // Creating and editing share these handlers: a new report is created as
  // a draft first, then the same save/submit path runs against its id.
  async function ensureId(): Promise<string | null> {
    if (existing) return existing.id;
    const res = await createReport(branchId, month);
    if (!res.ok) {
      setError(mapError(res.error, lang));
      return null;
    }
    return res.id;
  }

  function saveDraft() {
    setError(null);
    startTransition(async () => {
      const id = await ensureId();
      if (!id) return;
      const res = await updateReportDraft(id, sections);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.push(`/admin/branches/${branchId}/reports/${id}`);
    });
  }

  function submit() {
    setError(null);
    if (!allFilled) {
      setError(t('reports.form.validation_all_required', lang));
      return;
    }
    startTransition(async () => {
      const id = await ensureId();
      if (!id) return;
      const res = await submitReport(id, sections);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.push(`/admin/branches/${branchId}/reports/${id}`);
    });
  }

  return (
    <div className="mt-8 space-y-5">
      {!existing && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="label" htmlFor="report-month">
            {t('reports.form.month_label', lang)}
          </label>
          <select
            id="report-month"
            className="input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {REPORT_SECTIONS.map((key) => {
        const value = sections[key];
        const over = value.length > REPORT_SECTION_WARN;
        return (
          <div key={key} className="rounded-xl border border-gray-200 bg-white p-5">
            <label className="label" htmlFor={`section-${key}`}>
              {t(LABELS[key].label, lang)}
            </label>
            <textarea
              id={`section-${key}`}
              className="input"
              rows={4}
              maxLength={REPORT_SECTION_MAX}
              value={value}
              placeholder={t(LABELS[key].placeholder, lang)}
              onChange={(e) =>
                setSections((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
            <p
              className={
                'mt-1 text-right text-xs ' +
                (over ? 'font-semibold text-gold-warm-700' : 'text-muted')
              }
            >
              {t('reports.form.char_count', lang)
                .replace('{count}', String(value.length))
                .replace('{max}', String(REPORT_SECTION_MAX))}
            </p>
          </div>
        );
      })}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={saveDraft}
          disabled={pending || !month}
          className="btn-secondary"
        >
          {pending ? t('common.loading', lang) : t('reports.form.save_draft', lang)}
        </button>
        <button
          type="button"
          onClick={submit}
          // Left enabled when incomplete so the click explains why, rather
          // than presenting a dead button with no reason given.
          disabled={pending || !month}
          className="btn-primary"
        >
          {pending ? t('common.loading', lang) : t('reports.form.submit', lang)}
        </button>
      </div>
    </div>
  );
}
