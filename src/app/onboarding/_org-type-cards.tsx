'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Church, Users2, type LucideIcon } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, OrganizationType } from '@/lib/types';
import { selectOrgType } from './actions';

// The two Step 0 choices. Rendered as buttons rather than divs with an
// onClick so the whole card is reachable by keyboard and announced as
// actionable — the spec asks for the full area to be clickable, which a
// button gives for free along with Enter/Space activation.

type Choice = {
  value: OrganizationType;
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
  bulletKeys: [string, string, string];
};

const CHOICES: Choice[] = [
  {
    value: 'church',
    icon: Church,
    titleKey: 'onboarding.step_0.church.title',
    bodyKey: 'onboarding.step_0.church.body',
    bulletKeys: [
      'onboarding.step_0.church.bullet1',
      'onboarding.step_0.church.bullet2',
      'onboarding.step_0.church.bullet3',
    ],
  },
  {
    value: 'ministry',
    icon: Users2,
    titleKey: 'onboarding.step_0.ministry.title',
    bodyKey: 'onboarding.step_0.ministry.body',
    bulletKeys: [
      'onboarding.step_0.ministry.bullet1',
      'onboarding.step_0.ministry.bullet2',
      'onboarding.step_0.ministry.bullet3',
    ],
  },
];

export function OrgTypeCards({ lang }: { lang: AppLanguage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState<OrganizationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(value: OrganizationType) {
    setError(null);
    setChoosing(value);
    startTransition(async () => {
      const res = await selectOrgType(value);
      if (!res.ok) {
        setChoosing(null);
        setError(
          res.error === 'not_owner'
            ? t('onboarding.errNotOwner', lang)
            : res.error,
        );
        return;
      }
      router.push('/onboarding/step-1');
    });
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {CHOICES.map((c) => {
          const Icon = c.icon;
          const isChoosing = choosing === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => choose(c.value)}
              disabled={pending}
              aria-busy={isChoosing}
              className={
                'group flex cursor-pointer flex-col rounded-2xl border-2 bg-white p-8 text-left transition ' +
                'hover:border-indigo-royal-400 hover:shadow-lg ' +
                'focus:outline-none focus-visible:border-indigo-royal-400 focus-visible:shadow-lg ' +
                'focus-visible:ring-2 focus-visible:ring-indigo-royal-500 focus-visible:ring-offset-2 ' +
                'disabled:cursor-not-allowed disabled:opacity-60 ' +
                (isChoosing ? 'border-indigo-royal-400 shadow-lg' : 'border-gray-200')
              }
            >
              <Icon
                className="h-12 w-12 text-indigo-royal-700"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink">
                {t(c.titleKey, lang)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-body">
                {t(c.bodyKey, lang)}
              </p>
              <ul className="mt-5 space-y-2">
                {c.bulletKeys.map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-ink">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-royal-50">
                      <Check
                        className="h-3 w-3 text-indigo-royal-700"
                        aria-hidden="true"
                      />
                    </span>
                    {t(k, lang)}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </>
  );
}
