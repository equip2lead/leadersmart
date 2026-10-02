'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Google sign-in, shared by /login and /signup.
//
// One component for both because the only thing that differs is the label —
// the OAuth call is identical. Google does not distinguish sign-in from
// sign-up: the same consent flow either creates the identity or reuses it, so
// two implementations would be two chances for them to drift apart.
//
// Styling follows Google's branding guidance rather than the app's button
// classes: white ground, #DADCE0 border, #3C4043 text, 40px tall, 4px radius,
// 18px mark with a 12px gap. Those values are deliberately hardcoded — they
// are Google's, not ours, and should not follow a future change to our theme.

/** Google's four-colour "G". Inlined so it cannot 404 or be blocked. */
function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86a5.4 5.4 0 0 1-5.07-3.74H.96v2.33A8.99 8.99 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.93 10.68a5.41 5.41 0 0 1 0-3.36V4.99H.96a9 9 0 0 0 0 8.02l2.97-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.99l2.97 2.33A5.4 5.4 0 0 1 9 3.58z"
      />
    </svg>
  );
}

/** Horizontal rule with centred label, for separating the two sign-in paths. */
export function OrDivider({ lang }: { lang?: AppLanguage }) {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-gray-200" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {t('auth.login.or_divider', lang)}
      </span>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

export function GoogleSignInButton({
  mode,
  lang,
  next = '/dashboard',
}: {
  /** Only changes the label. The OAuth call is the same either way. */
  mode: 'signin' | 'signup';
  lang?: AppLanguage;
  /** Where to land once provisioning is settled. */
  next?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      // Success navigates away, so reaching here with no error is still a
      // pending redirect — leave the button disabled rather than flashing
      // it back to idle underneath a page that is already leaving.
      if (oauthError) {
        setError(t('auth.oauth.error', lang));
        setLoading(false);
      }
    } catch {
      setError(t('auth.oauth.error', lang));
      setLoading(false);
    }
  }

  const label = t(
    mode === 'signup' ? 'auth.signup.google_button' : 'auth.login.google_button',
    lang,
  );

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        // w-full below sm so it does not overflow a narrow phone; the 240px
        // minimum from Google's guidance applies once there is room for it.
        className="flex h-10 w-full items-center justify-center gap-3 rounded border border-[#DADCE0] bg-white px-4 text-sm font-medium text-[#3C4043] transition-colors hover:bg-[#F8F9FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-royal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[240px]"
      >
        <GoogleMark />
        <span>{loading ? t('common.loading', lang) : label}</span>
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
