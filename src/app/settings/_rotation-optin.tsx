'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { FIFTH_SUNDAY_GROUP, ROTATION_GROUPS } from '@/lib/types';
import type { AppLanguage, ServingGroup } from '@/lib/types';
import { joinRotation } from './rotation-optin-actions';

// "Join the rotation" for someone who already has an account. Name, phone and
// email come from their profile, so the form asks only what the profile does
// not already know: which group.

export function RotationOptIn({
  lang,
  existingToken,
}: {
  lang: AppLanguage;
  /** Set once they have signed up — the section then shows their link
      instead of the form. */
  existingToken: string | null;
}) {
  const router = useRouter();
  const [token, setToken] = useState(existingToken);
  const [groups, setGroups] = useState<ServingGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await joinRotation(groups);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setToken(res.token);
      router.refresh();
    });
  }

  if (token) {
    return (
      <div className="mt-4">
        <p className="text-sm text-body">{t('rotation.optin.already', lang)}</p>
        <a href={`/me/${token}`} className="btn-secondary mt-3">
          {t('rotation.optin.view_schedule', lang)}
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm text-body">{t('rotation.optin.body', lang)}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[...ROTATION_GROUPS, FIFTH_SUNDAY_GROUP].map((g) => {
          const on = groups.includes(g);
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() =>
                setGroups((prev) =>
                  prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
                )
              }
              className={
                'rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ' +
                (on
                  ? 'border-indigo-royal-200 bg-indigo-royal-50 text-indigo-royal-700'
                  : 'border-gray-200 bg-white text-muted hover:text-ink')
              }
            >
              {g === FIFTH_SUNDAY_GROUP
                ? t('rotation.signup.group_e_label', lang)
                : t(`rotation.group.${g}`, lang)}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        {t('rotation.signup.groups_hint', lang)}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn-primary mt-4"
        disabled={pending}
        onClick={submit}
      >
        {t('rotation.optin.submit', lang)}
      </button>
    </div>
  );
}
