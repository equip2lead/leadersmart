'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { completeGoogleSignup } from './actions';

export function WelcomeForm({
  lang,
  suggestedName,
}: {
  lang: AppLanguage;
  /** Display name from the Google identity, if it supplied one. */
  suggestedName: string;
}) {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await completeGoogleSignup(orgName, fullName);
      if (!res.ok) {
        setError(t('auth.welcome.error', lang));
        return;
      }
      // Into the wizard, which is where a brand-new owner belongs. /onboarding
      // works from here because the users row now exists.
      router.push('/onboarding');
      router.refresh();
    });
  }

  return (
    <div className="card">
      <h1 className="text-center text-2xl font-bold text-ink">
        {t('auth.onboarding.google_welcome', lang)}
      </h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="w-org">
            {t('auth.welcome.org_name_label', lang)}
          </label>
          <input
            id="w-org"
            required
            autoFocus
            maxLength={120}
            className="input"
            value={orgName}
            disabled={pending}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">
            {t('auth.welcome.org_name_hint', lang)}
          </p>
        </div>

        {/* Prefilled from the Google profile, editable because the name on a
            Google account is often not the name a congregation uses. */}
        <div>
          <label className="label" htmlFor="w-name">
            {t('auth.signup.yourName', lang)}
          </label>
          <input
            id="w-name"
            className="input"
            value={fullName}
            disabled={pending}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || orgName.trim().length === 0}
          className="btn-primary w-full"
        >
          {pending ? t('common.loading', lang) : t('auth.welcome.submit', lang)}
        </button>
      </form>
    </div>
  );
}
