'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { assignPomStep, skipPomStep } from '../actions';

export type PastorOption = {
  id: string;
  fullName: string;
  isSelf: boolean;
};

export function Step4Form({
  lang,
  pastors,
  hasOtherAdmins,
}: {
  lang: AppLanguage;
  pastors: PastorOption[];
  hasOtherAdmins: boolean;
}) {
  const router = useRouter();

  const defaultMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthOptions = useMemo(() => {
    // Current month + next two, per spec.
    const out: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'long',
        year: 'numeric',
      });
      out.push({ value: v, label });
    }
    return out;
  }, [lang]);

  const [pastorId, setPastorId] = useState<string>(pastors[0]?.id ?? '');
  const [month, setMonth] = useState<string>(defaultMonth);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!pastorId) {
      setError(t('onboarding.step4.errPastor', lang));
      return;
    }
    startTransition(async () => {
      const res = await assignPomStep({
        pastorUserId: pastorId,
        monthYYYYMM: month,
      });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.push('/dashboard');
    });
  }

  function onSkip() {
    setError(null);
    startTransition(async () => {
      const res = await skipPomStep();
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.push('/dashboard');
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      {!hasOtherAdmins && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{t('onboarding.step4.onlySelfNote', lang)}</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="pom-pastor">
          {t('onboarding.step4.pastorLabel', lang)}
        </label>
        <select
          id="pom-pastor"
          className="input"
          value={pastorId}
          onChange={(e) => setPastorId(e.target.value)}
        >
          {pastors.map((p) => (
            <option key={p.id} value={p.id}>
              {p.isSelf
                ? `${p.fullName} (${t('onboarding.step4.yourself', lang)})`
                : p.fullName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="pom-month">
          {t('onboarding.step4.monthLabel', lang)}
        </label>
        <select
          id="pom-month"
          className="input"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

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
            : t('onboarding.finish', lang)}
        </button>
      </div>
    </form>
  );
}

function mapError(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'invalid_month':
      return t('onboarding.step4.errMonth', lang);
    case 'invalid_pastor':
    case 'ineligible_pastor':
      return t('onboarding.step4.errPastor', lang);
    case 'not_owner':
      return t('onboarding.errNotOwner', lang);
    default:
      return code;
  }
}
