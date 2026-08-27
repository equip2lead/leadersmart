'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppLanguage } from '@/lib/types';

// Language toggle for the marketing landing. Persists the choice to
// both a cookie (so the server can read it on next request) and
// localStorage (so it survives even if cookies are wiped for auth
// reasons). Clicking triggers router.refresh() so the server component
// re-reads the cookie and re-renders in the new language.
export function LangToggle({ current }: { current: AppLanguage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Mirror `current` in state so the active pill highlights immediately
  // (before the server round-trip completes).
  const [active, setActive] = useState<AppLanguage>(current);

  useEffect(() => {
    setActive(current);
  }, [current]);

  function pick(lang: AppLanguage) {
    if (lang === active) return;
    setActive(lang);
    try {
      window.localStorage.setItem('preferred_lang', lang);
    } catch {
      // Private mode or storage disabled — cookie path still works.
    }
    document.cookie = `preferred_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5 text-xs font-semibold"
    >
      {(['en', 'fr'] as const).map((lang) => {
        const isActive = active === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => pick(lang)}
            disabled={pending}
            aria-pressed={isActive}
            className={
              isActive
                ? 'rounded-full bg-indigo-royal-700 px-3 py-1 text-white'
                : 'rounded-full px-3 py-1 text-muted hover:text-ink'
            }
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
