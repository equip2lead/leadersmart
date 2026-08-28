import { cookies } from 'next/headers';
import { getMe } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { ensureProgress } from '../_progress-lib';
import { ProgressSidebar } from '../_progress-sidebar';
import { Step1Form } from './_form';
import { COUNTRIES } from '../_countries';

export const dynamic = 'force-dynamic';

export default async function Step1Page() {
  const me = await getMe();
  const lang = me.user.preferred_language;
  const progress = await ensureProgress(me);
  const supabase = await createClient();

  // Load current church so we can prefill (name comes from signup;
  // country + language default from cookies + prior progress).
  const { data: church } = await supabase
    .from('churches')
    .select('name, country, language, logo_url')
    .eq('id', me.church.id)
    .maybeSingle();

  // Country fallback: geo-cookie set by middleware (same source the
  // pricing card uses) → matched against ISO alpha-2 → default 'US'.
  const jar = await cookies();
  const geoCountry = jar.get('preferred_country')?.value ?? null;
  const initialCountry =
    church?.country ??
    (geoCountry && COUNTRIES.some((c) => c.code === geoCountry) ? geoCountry : '');

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-[280px_1fr]">
      <ProgressSidebar
        currentStep={1}
        progress={progress}
        lang={lang}
        orgType={me.church.organization_type}
      />
      <div className="px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {t('onboarding.step1.title', lang)}
        </h1>
        <p className="mt-2 text-sm text-body">
          {t('onboarding.step1.subtitle', lang)}
        </p>
        <div className="mt-8">
          <Step1Form
            lang={lang}
            initial={{
              name: church?.name ?? '',
              country: initialCountry,
              language: (church?.language as 'en' | 'fr') ?? lang,
              logoUrl: church?.logo_url ?? null,
            }}
            churchId={me.church.id}
          />
        </div>
      </div>
    </div>
  );
}
