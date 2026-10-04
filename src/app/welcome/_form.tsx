'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Church, Network } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, OrganizationType } from '@/lib/types';
import { completeGoogleSignup } from './actions';

// Two steps, in this order, for one reason: the name field cannot be labelled
// until the type is known. A single "organisation name" box is what produced a
// tenant called "Love of God ministry" with organization_type = 'church' —
// nothing had asked, so the column took its default and the name was the only
// clue anyone had.
//
// The type is also what the wizard's step 0 used to ask, immediately after
// this page. Asking here and stamping it means the owner answers once.

const ORG_TYPES: Array<{
  value: OrganizationType;
  Icon: typeof Church;
  titleKey: string;
  subtitleKey: string;
}> = [
  {
    value: 'church',
    Icon: Church,
    titleKey: 'auth.welcome.org_type.church.title',
    subtitleKey: 'auth.welcome.org_type.church.subtitle',
  },
  {
    value: 'ministry',
    Icon: Network,
    titleKey: 'auth.welcome.org_type.ministry.title',
    subtitleKey: 'auth.welcome.org_type.ministry.subtitle',
  },
];

function fill(key: string, lang: AppLanguage, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (out, [k, v]) => out.replace(`{${k}}`, v),
    t(key, lang),
  );
}

export function WelcomeForm({
  lang,
  suggestedName,
}: {
  lang: AppLanguage;
  /** Display name from the Google identity, if it supplied one. */
  suggestedName: string;
}) {
  const router = useRouter();
  // Step and choice are separate state. Deriving the step from "is orgType
  // set" would make Back destructive — it would have to clear the choice to
  // get back to step 1, which is precisely what the picker must not do.
  const [step, setStep] = useState<1 | 2>(1);
  const [orgType, setOrgType] = useState<OrganizationType | null>(null);
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!orgType) return;
    setError(null);
    startTransition(async () => {
      const res = await completeGoogleSignup(orgName, fullName, orgType);
      if (!res.ok) {
        setError(t('auth.welcome.error', lang));
        return;
      }
      // Into the wizard, which is where a brand-new owner belongs. /onboarding
      // works from here because the users row now exists, and it skips its
      // step 0 because bootstrap stamped org_type_selected_at.
      router.push('/onboarding');
      router.refresh();
    });
  }

  const isMinistry = orgType === 'ministry';

  function choose(value: OrganizationType) {
    setOrgType(value);
    setStep(2);
  }

  return (
    <div className="card">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted">
        {fill('auth.welcome.step_label', lang, {
          current: String(step),
          total: '2',
        })}
      </p>

      <h1 className="mt-2 text-center text-2xl font-bold text-ink">
        {step === 1
          ? t('auth.welcome.step1_title', lang)
          : t('auth.onboarding.google_welcome', lang)}
      </h1>
      <p className="mt-1 text-center text-sm text-body">
        {step === 1
          ? t('auth.welcome.step1_subtitle', lang)
          : t('auth.welcome.org_name_hint', lang)}
      </p>

      {step === 1 ? (
        // Stacked on a phone, side by side from sm up.
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ORG_TYPES.map(({ value, Icon, titleKey, subtitleKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              aria-pressed={orgType === value}
              className={
                'group flex h-full flex-col items-start rounded-xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-royal-500 hover:shadow-card focus:outline-none focus-visible:border-indigo-royal-500 focus-visible:ring-2 focus-visible:ring-indigo-royal-500 focus-visible:ring-offset-2 ' +
                // Returning via Back shows which card they already picked.
                (orgType === value
                  ? 'border-indigo-royal-500 shadow-card'
                  : 'border-gray-200')
              }
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-royal-50 text-indigo-royal-700 transition group-hover:bg-indigo-royal-100">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-3 text-sm font-semibold text-ink">
                {t(titleKey, lang)}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-body">
                {t(subtitleKey, lang)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="w-org">
              {t(
                isMinistry
                  ? 'auth.welcome.ministry_name_label'
                  : 'auth.welcome.church_name_label',
                lang,
              )}
            </label>
            <input
              id="w-org"
              required
              autoFocus
              maxLength={120}
              className="input"
              placeholder={t(
                isMinistry
                  ? 'auth.welcome.ministry_name_placeholder'
                  : 'auth.welcome.church_name_placeholder',
                lang,
              )}
              value={orgName}
              disabled={pending}
              onChange={(e) => setOrgName(e.target.value)}
            />
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
            {pending
              ? t('common.loading', lang)
              : t('auth.welcome.submit_button', lang)}
          </button>

          {/* Keeps orgType, so step 1 reopens with the same card marked. */}
          <button
            type="button"
            disabled={pending}
            onClick={() => setStep(1)}
            className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('auth.welcome.step2_back_button', lang)}
          </button>
        </form>
      )}
    </div>
  );
}
