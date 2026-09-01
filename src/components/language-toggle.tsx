'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { setUserLanguage } from '@/app/_actions/language';

// In-app language switch. Distinct from the landing page's LangToggle,
// which writes a cookie for anonymous visitors — this persists to
// users.preferred_language, so the choice survives sessions and devices.
export function LanguageToggle({ current }: { current: AppLanguage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Mirrored so the pill highlights immediately, before the server
  // round-trip and re-render land.
  const [active, setActive] = useState<AppLanguage>(current);

  useEffect(() => {
    setActive(current);
  }, [current]);

  function pick(lang: AppLanguage) {
    if (lang === active || pending) return;
    const previous = active;
    setActive(lang);
    startTransition(async () => {
      const res = await setUserLanguage(lang);
      if (!res.ok) {
        // Roll the optimistic highlight back rather than leaving the pill
        // claiming a language the server never stored.
        setActive(previous);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t('header.language_toggle_aria_label', current)}
      className="inline-flex items-center rounded-full border border-[#1A1E3F]/15 bg-white p-0.5 text-xs font-bold"
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
              'rounded-full px-3 py-1 transition disabled:opacity-60 ' +
              (isActive
                ? 'bg-[#1A1E3F] text-[#EFCB4A]'
                : 'text-[#3D4470] hover:bg-[#F9F4E7] hover:text-[#1A1E3F]')
            }
          >
            {t(
              lang === 'en' ? 'header.language_english' : 'header.language_french',
              current,
            )}
          </button>
        );
      })}
    </div>
  );
}
