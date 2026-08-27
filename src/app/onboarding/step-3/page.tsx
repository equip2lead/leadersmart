import { getMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { ensureProgress } from '../_progress-lib';
import { ProgressSidebar } from '../_progress-sidebar';
import { Step3Form } from './_form';

export const dynamic = 'force-dynamic';

// Suggestion list. Localised via i18n at render time so we can also
// keep a stable EN slug for the audit trail (unused here but future-
// proofing).
const SUGGESTION_KEYS: string[] = [
  'onboarding.step3.suggest.ushering',
  'onboarding.step3.suggest.welcome',
  'onboarding.step3.suggest.children',
  'onboarding.step3.suggest.prayer',
  'onboarding.step3.suggest.media',
  'onboarding.step3.suggest.cleaning',
  'onboarding.step3.suggest.worship',
  'onboarding.step3.suggest.security',
];

export default async function Step3Page() {
  const me = await getMe();
  const lang = me.user.preferred_language;
  const progress = await ensureProgress(me);

  const suggestions = SUGGESTION_KEYS.map((k) => t(k, lang));

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-[280px_1fr]">
      <ProgressSidebar currentStep={3} progress={progress} lang={lang} />
      <div className="px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {t('onboarding.step3.title', lang)}
        </h1>
        <p className="mt-2 text-sm text-body">
          {t('onboarding.step3.subtitle', lang)}
        </p>
        <div className="mt-8">
          <Step3Form lang={lang} suggestions={suggestions} />
        </div>
      </div>
    </div>
  );
}
