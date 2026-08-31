'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { resetOrgType } from './actions';

// Escape hatch from steps 1-3 back to the Step 0 decision page, for an
// owner who picked the wrong org type. Deliberately a quiet text link
// rather than a button: it is a correction, not part of the happy path.
//
// Not rendered on step 4 — that step only exists for churches, so an
// owner who reaches it has already been routed by the choice they would
// be undoing, and resetting from there would discard the most work.
export function ChangeOrgType({ lang }: { lang: AppLanguage }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe choice on open, and let Escape dismiss — the
  // destructive option should never be the one a stray Enter hits.
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending]);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await resetOrgType();
      if (!res.ok) {
        setError(
          res.error === 'not_owner'
            ? t('onboarding.errNotOwner', lang)
            : res.error === 'already_completed'
              ? t('onboarding.changeOrgType.errCompleted', lang)
              : res.error,
        );
        return;
      }
      setOpen(false);
      router.push('/onboarding');
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-sm font-medium text-gray-500 transition hover:text-gray-700"
      >
        {t('onboarding.changeOrgType.link', lang)}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-org-type-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="change-org-type-title"
              className="text-lg font-bold text-ink"
            >
              {t('onboarding.changeOrgType.title', lang)}
            </h2>
            <p className="mt-2 text-sm text-body">
              {t('onboarding.changeOrgType.body', lang)}
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="btn-secondary"
              >
                {t('common.cancel', lang)}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="btn-primary"
              >
                {pending
                  ? t('common.loading', lang)
                  : t('onboarding.changeOrgType.confirm', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
