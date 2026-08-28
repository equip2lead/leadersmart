import { getMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { hasAdminKey } from '@/lib/supabase/admin';
import { ensureProgress } from '../_progress-lib';
import { ProgressSidebar } from '../_progress-sidebar';
import { Step2Form } from './_form';

export const dynamic = 'force-dynamic';

export default async function Step2Page() {
  const me = await getMe();
  const lang = me.user.preferred_language;
  const progress = await ensureProgress(me);
  const serviceKeyAvailable = hasAdminKey();

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-[280px_1fr]">
      <ProgressSidebar
        currentStep={2}
        progress={progress}
        lang={lang}
        orgType={me.church.organization_type}
      />
      <div className="px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {t('onboarding.step2.title', lang)}
        </h1>
        <p className="mt-2 text-sm text-body">
          {t('onboarding.step2.subtitle', lang)}
        </p>
        <div className="mt-8">
          <Step2Form lang={lang} serviceKeyAvailable={serviceKeyAvailable} />
        </div>
      </div>
    </div>
  );
}
