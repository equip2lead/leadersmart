'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, OrganizationType } from '@/lib/types';
import {
  createDepartmentsStep,
  finishMinistryWizard,
  skipDepartmentsStep,
} from '../actions';

export function Step3Form({
  lang,
  suggestions,
  orgType,
}: {
  lang: AppLanguage;
  suggestions: string[];
  orgType: OrganizationType;
}) {
  const router = useRouter();
  const isMinistry = orgType === 'ministry';
  // Ministries end here: there is no step 4, so saving or skipping this
  // step has to close the wizard before navigating, otherwise /dashboard
  // would bounce them straight back into onboarding.
  const advance = async (): Promise<string | null> => {
    if (!isMinistry) {
      router.push('/onboarding/step-4');
      return null;
    }
    const done = await finishMinistryWizard();
    if (!done.ok) return mapError(done.error, lang);
    router.push('/dashboard');
    return null;
  };
  const k = (base: string) =>
    isMinistry
      ? `onboarding.step3.ministry.${base}`
      : `onboarding.step3.${base}`;
  // Suggestion state: name → checked. Initialised true for all so the
  // spec's "pre-checked by default so pastor can just uncheck" behaviour
  // holds.
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(suggestions.map((s) => [s, true])),
  );
  const [customName, setCustomName] = useState('');
  const [custom, setCustom] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(name: string) {
    setSelected((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function addCustom() {
    const trimmed = customName.trim();
    if (!trimmed) return;
    if (trimmed.length > 60) return;
    if (custom.includes(trimmed)) {
      setCustomName('');
      return;
    }
    setCustom((prev) => [...prev, trimmed]);
    setCustomName('');
  }

  function removeCustom(name: string) {
    setCustom((prev) => prev.filter((n) => n !== name));
  }

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const names = [
      ...suggestions.filter((s) => selected[s]),
      ...custom,
    ];
    startTransition(async () => {
      const res = await createDepartmentsStep(names);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      const advErr = await advance();
      if (advErr) setError(advErr);
    });
  }

  function onSkip() {
    setError(null);
    startTransition(async () => {
      const res = await skipDepartmentsStep();
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      const advErr = await advance();
      if (advErr) setError(advErr);
    });
  }

  const totalChecked =
    suggestions.filter((s) => selected[s]).length + custom.length;

  return (
    <form onSubmit={onSave} className="space-y-6">
      <fieldset>
        <legend className="label">
          {t(k('suggestionsLabel'), lang)}
        </legend>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {suggestions.map((s) => {
            const checked = !!selected[s];
            return (
              <li key={s}>
                <label
                  className={
                    'flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ' +
                    (checked
                      ? 'border-indigo-royal-700 bg-indigo-royal-50 text-ink'
                      : 'border-gray-200 bg-white text-body hover:border-gray-300')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(s)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-royal-700 focus:ring-indigo-royal-500"
                  />
                  <span className="font-medium">{s}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div>
        <label className="label" htmlFor="custom-dept">
          {t(k('customLabel'), lang)}
        </label>
        <div className="flex gap-2">
          <input
            id="custom-dept"
            className="input"
            placeholder={t(k('customPlaceholder'), lang)}
            value={customName}
            maxLength={60}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customName.trim()}
            className="btn-secondary shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t('common.add', lang)}
          </button>
        </div>
        {custom.length > 0 && (
          <ul className="mt-3 space-y-2">
            {custom.map((c) => (
              <li
                key={c}
                className="flex items-center justify-between rounded-xl border border-indigo-royal-100 bg-indigo-royal-50 px-4 py-2 text-sm text-ink"
              >
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => removeCustom(c)}
                  className="rounded-md p-1 text-muted hover:bg-white hover:text-red-600"
                  aria-label={t('common.delete', lang)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted">
        {t(k('count'), lang).replace('{n}', String(totalChecked))}
      </p>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
  if (code === 'not_owner') return t('onboarding.errNotOwner', lang);
  return code;
}
