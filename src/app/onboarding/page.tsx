import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { ensureProgress, nextStep } from './_progress-lib';
import { OrgTypeCards } from './_org-type-cards';

export const dynamic = 'force-dynamic';

// Step 0 — the church/ministry fork, and the entry point for the whole
// wizard. Three outcomes:
//
//   finished onboarding      → /dashboard
//   already picked a type    → resume at the furthest incomplete step
//   never picked a type      → render the decision page
//
// The resume branch deliberately uses nextStep() rather than always
// sending people to step 1: this route is what /dashboard redirects
// owners to on every visit, so hard-coding step 1 would restart the
// wizard for anyone who got partway through and came back.
export default async function OnboardingRoot() {
  const me = await getMe();

  if (me.user.onboarding_completed_at) redirect('/dashboard');

  const progress = await ensureProgress(me);
  if (progress.org_type_selected_at) {
    redirect(`/onboarding/step-${nextStep(progress, me.church.organization_type)}`);
  }

  const lang = me.user.preferred_language;

  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
          {t('onboarding.step_0.title', lang)}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-body">
          {t('onboarding.step_0.subtitle', lang)}
        </p>
      </div>

      <div className="mt-10">
        <OrgTypeCards lang={lang} />
      </div>
    </div>
  );
}
