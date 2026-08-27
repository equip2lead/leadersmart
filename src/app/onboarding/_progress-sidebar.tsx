import { Check } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import type { OnboardingProgress } from './_progress-lib';

type Step = 1 | 2 | 3 | 4;

// Left-side vertical progress: completed steps get a filled brand
// disc + checkmark, current step gets a filled brand disc + number,
// upcoming steps get a hollow gray disc + number.
export function ProgressSidebar({
  currentStep,
  progress,
  lang,
}: {
  currentStep: Step;
  progress: OnboardingProgress;
  lang: AppLanguage;
}) {
  const status = (step: Step): 'done' | 'current' | 'upcoming' => {
    if (step < currentStep && isStepDone(step, progress)) return 'done';
    if (step === currentStep) return 'current';
    if (step < currentStep) return 'done';
    return 'upcoming';
  };

  const steps: Array<{ n: Step; titleKey: string; hintKey: string }> = [
    { n: 1, titleKey: 'onboarding.step1.navTitle', hintKey: 'onboarding.step1.navHint' },
    { n: 2, titleKey: 'onboarding.step2.navTitle', hintKey: 'onboarding.step2.navHint' },
    { n: 3, titleKey: 'onboarding.step3.navTitle', hintKey: 'onboarding.step3.navHint' },
    { n: 4, titleKey: 'onboarding.step4.navTitle', hintKey: 'onboarding.step4.navHint' },
  ];

  return (
    <aside className="hidden border-r border-gray-100 bg-gray-50 px-8 py-10 md:block">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        {t('onboarding.progress.title', lang)}
      </p>
      <ol className="mt-6 space-y-6">
        {steps.map((s) => {
          const st = status(s.n);
          return (
            <li key={s.n} className="flex items-start gap-3">
              <span
                className={
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                  (st === 'done'
                    ? 'bg-brand-700 text-white'
                    : st === 'current'
                      ? 'bg-brand-700 text-white ring-4 ring-brand-100'
                      : 'border border-gray-300 bg-white text-gray-500')
                }
              >
                {st === 'done' ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <div className="min-w-0">
                <p
                  className={
                    'text-sm font-semibold ' +
                    (st === 'upcoming' ? 'text-gray-500' : 'text-ink')
                  }
                >
                  {t(s.titleKey, lang)}
                </p>
                <p className="mt-0.5 text-xs text-muted">{t(s.hintKey, lang)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function isStepDone(step: Step, p: OnboardingProgress): boolean {
  switch (step) {
    case 1:
      return !!p.church_profile_completed_at;
    case 2:
      return !!(p.admins_invited_at || p.admins_skipped_at);
    case 3:
      return !!(p.departments_created_at || p.departments_skipped_at);
    case 4:
      return !!(p.pom_assigned_at || p.pom_skipped_at);
  }
}
