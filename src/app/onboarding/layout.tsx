import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { t } from '@/lib/i18n';
import { LangToggle } from '@/app/_landing/lang-toggle';

export const dynamic = 'force-dynamic';

// Wraps every /onboarding/* page. Guards on:
//   - authenticated (auth.getUser inside getMe redirects to /login)
//   - owner role
//   - onboarding not yet completed
// so a signed-in owner returning to /onboarding after finishing is
// bounced back to /dashboard.
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();
  if (!OWNER_ROLES.includes(me.user.role)) redirect('/dashboard');
  if (me.user.onboarding_completed_at) redirect('/dashboard');

  const lang = me.user.preferred_language;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-gold-warm-600" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight text-indigo-royal-700">
            Equip2Lead Coach
          </span>
          <span className="ml-2 text-xs font-medium uppercase tracking-wider text-muted">
            {t('onboarding.brandTag', lang)}
          </span>
        </Link>
        <LangToggle current={lang} />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        {children}
      </div>
    </div>
  );
}
