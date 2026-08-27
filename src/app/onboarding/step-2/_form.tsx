'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Plus, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { inviteAdminsStep, skipAdminsStep } from '../actions';

const MAX_ROWS = 5;
const START_ROWS = 3;

type Row = { name: string; email: string };

const emptyRow = (): Row => ({ name: '', email: '' });

export function Step2Form({
  lang,
  serviceKeyAvailable,
}: {
  lang: AppLanguage;
  serviceKeyAvailable: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: START_ROWS }, emptyRow),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, emptyRow()]));
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await inviteAdminsStep(rows);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      if (res.failures.length > 0) {
        // Some rows failed. Show a soft notice but still move on — the
        // owner can retry from /admin/users.
        setNotice(
          t('onboarding.step2.partialSuccess', lang)
            .replace('{ok}', String(res.invited))
            .replace('{fail}', String(res.failures.length)),
        );
      }
      router.push('/onboarding/step-3');
    });
  }

  function onSkip() {
    setError(null);
    startTransition(async () => {
      const res = await skipAdminsStep();
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.push('/onboarding/step-3');
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-indigo-royal-100 bg-indigo-royal-50 px-4 py-3 text-xs text-indigo-royal-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{t('onboarding.step2.info', lang)}</p>
      </div>

      {!serviceKeyAvailable && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('onboarding.step2.serviceKeyMissing', lang)}
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li
            key={i}
            className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
          >
            <input
              className="input"
              placeholder={t('onboarding.step2.namePlaceholder', lang)}
              value={r.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
              disabled={!serviceKeyAvailable}
            />
            <input
              className="input"
              type="email"
              placeholder={t('onboarding.step2.emailPlaceholder', lang)}
              value={r.email}
              onChange={(e) => updateRow(i, { email: e.target.value })}
              disabled={!serviceKeyAvailable}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="justify-self-end rounded-md p-2 text-muted hover:bg-gray-50 hover:text-red-600 disabled:opacity-40"
              disabled={rows.length <= 1 || !serviceKeyAvailable}
              aria-label={t('common.delete', lang)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        disabled={rows.length >= MAX_ROWS || !serviceKeyAvailable}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-royal-700 hover:bg-indigo-royal-50 disabled:opacity-40"
      >
        <Plus className="h-3 w-3" />
        {t('onboarding.step2.addRow', lang)}
      </button>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="flex flex-col-reverse items-stretch gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          {t('onboarding.skipForNow', lang)}
        </button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending
            ? t('common.loading', lang)
            : t('onboarding.saveContinue', lang)}
        </button>
      </div>
    </form>
  );
}

function mapError(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'missing_service_key':
      return t('onboarding.step2.serviceKeyMissing', lang);
    case 'not_owner':
      return t('onboarding.errNotOwner', lang);
    default:
      return code;
  }
}
