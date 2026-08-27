'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_CURRENCIES, type CurrencyCode } from '@/lib/currency';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Overrides the geo-detected currency. Writes cookie + triggers a
// server refresh so the pricing card re-renders in the new currency.
export function CurrencySelector({
  current,
  lang,
}: {
  current: CurrencyCode;
  lang: AppLanguage;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(next: string) {
    if (next === current) return;
    document.cookie = `preferred_currency=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      <span>{t('landing.pricing.changeCurrency', lang)}:</span>
      <select
        value={current}
        onChange={(e) => pick(e.target.value)}
        disabled={pending}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-ink focus:border-indigo-royal-500 focus:outline-none"
      >
        {ALL_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
