import Link from 'next/link';
import { Flame } from 'lucide-react';
import { LangToggle } from '@/app/_landing/lang-toggle';
import type { AppLanguage } from '@/lib/types';

// Chrome for the public auth pages: wordmark, language toggle, centred card.
//
// Shared because /login, /forgot-password, /reset-password and /welcome had
// four copies of the same header markup, and the toggle has to appear on all
// four — a Francophone pastor who can switch language on three of them and
// not the fourth is worse off than one who can switch on none, because the
// gap looks like a bug rather than a missing feature.
//
// Uses the landing page's LangToggle, not the in-app LanguageToggle. The
// in-app one persists to users.preferred_language through a server action,
// which needs a users row — and these pages are reachable before that row
// exists (/welcome) or before there is any session at all (/login). The
// landing toggle writes a cookie plus localStorage, which works for both.
export function AuthPageShell({
  lang,
  children,
}: {
  lang: AppLanguage;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:py-12">
      {/* The toggle sits above the card on its own row, so it keeps the
          top-right corner on a phone instead of crowding the wordmark. */}
      <div className="mx-auto flex w-full max-w-md justify-end">
        <LangToggle current={lang} />
      </div>

      <div className="mx-auto w-full max-w-md pt-4">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-ink"
        >
          <Flame className="h-8 w-8 text-gold-warm-600" aria-hidden="true" />
          <span className="text-xl font-bold">LeaderSmart</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
