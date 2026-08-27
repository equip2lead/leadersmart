import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ensureProgress, nextStep } from './_progress-lib';

export const dynamic = 'force-dynamic';

// Root onboarding entry — figures out which step the user last
// completed and jumps them there. First-time visitors land on step 1.
export default async function OnboardingRoot() {
  const me = await getMe();
  const progress = await ensureProgress(me);
  redirect(`/onboarding/step-${nextStep(progress)}`);
}
