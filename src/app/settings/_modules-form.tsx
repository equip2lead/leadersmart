'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { updateChurchRotationEnabled } from './actions';

// The "Optional modules" section. Rendered only for churches — the page
// decides that, and the server action refuses a ministry independently.

function mapError(code: string, lang: AppLanguage): string {
  const key = `settings.rotation.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

export function ModulesForm({
  lang,
  initialRotationEnabled,
}: {
  lang: AppLanguage;
  initialRotationEnabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialRotationEnabled);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setError(null);
    setSaved(false);
    // Optimistic, then reconciled: the switch is the kind of control that
    // feels broken if it waits for a round trip. Reverted on failure.
    setEnabled(next);
    startTransition(async () => {
      const res = await updateChurchRotationEnabled(next);
      if (!res.ok) {
        setEnabled(!next);
        setError(mapError(res.error, lang));
        return;
      }
      setSaved(true);
      // The sidebar link appears or disappears with this value, and it lives
      // in the layout above this page.
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <p className="text-sm text-body">
        {t('settings.optional_modules.subtitle', lang)}
      </p>

      <div className="mt-4 rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {t('settings.rotation.toggle_label', lang)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-body">
              {t('settings.rotation.toggle_description', lang)}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={t('settings.rotation.toggle_label', lang)}
            disabled={pending}
            onClick={toggle}
            className={
              'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-royal-500 focus:ring-offset-2 ' +
              (enabled ? 'bg-indigo-royal-700' : 'bg-gray-300')
            }
          >
            <span
              className={
                'inline-block h-4 w-4 transform rounded-full bg-white transition ' +
                (enabled ? 'translate-x-6' : 'translate-x-1')
              }
            />
          </button>
        </div>

        <p className="mt-3 text-xs font-semibold text-muted">
          {t(enabled ? 'settings.rotation.on' : 'settings.rotation.off', lang)}
          {saved && !error && (
            <span className="ml-2 font-medium text-emerald-700">
              {t('settings.rotation.saved', lang)}
            </span>
          )}
        </p>

        {error && (
          <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
