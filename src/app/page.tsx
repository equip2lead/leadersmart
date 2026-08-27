import { cookies } from 'next/headers';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import {
  alternateDisplays,
  isCurrencyCode,
  priceFor,
  type CurrencyCode,
} from '@/lib/currency';
import { LandingHeader } from './_landing/header';
import { Hero } from './_landing/hero';
import { TrustStrip } from './_landing/trust-strip';
import { MetricStrip } from './_landing/metric-strip';
import { Rhythms } from './_landing/rhythms';
import {
  ShowcasePeerEvaluation,
  ShowcaseSundayChecklist,
} from './_landing/showcase';
import { Features } from './_landing/features';
import { Pricing } from './_landing/pricing';
import { Testimonial } from './_landing/testimonial';
import { FAQ } from './_landing/faq';
import { FinalCta } from './_landing/final-cta';
import { FullFooter } from './_landing/footer';

export const dynamic = 'force-dynamic';

// Marketing landing page. Reads the preferred_lang and preferred_currency
// cookies that middleware sets on first visit, then renders every section
// server-side pre-translated and pre-priced. Only the header, the lang
// toggle, the rhythm tabs, and the currency selector cross the client
// boundary.
//
// Palette is the yellow rebrand — yellow #EFCB4A, sage #A8C79A, navy
// #1A1E3F on cream #FDFCF7 — carried as arbitrary Tailwind values rather
// than config tokens, because the authenticated app is still on Royal
// Indigo and the two must not share a scale until that pivot lands.

export default async function LandingPage() {
  const jar = await cookies();
  const langCookie = jar.get('preferred_lang')?.value;
  const lang: AppLanguage = langCookie === 'fr' ? 'fr' : 'en';

  const currencyCookie = jar.get('preferred_currency')?.value;
  const currency: CurrencyCode =
    currencyCookie && isCurrencyCode(currencyCookie) ? currencyCookie : 'USD';
  const price = priceFor(currency);
  const equivalents = alternateDisplays(currency);

  return (
    <>
      <LandingHeader lang={lang} />
      <main>
        <Hero lang={lang} />
        <TrustStrip lang={lang} />
        <MetricStrip lang={lang} />
        <Rhythms lang={lang} />
        <ShowcaseSundayChecklist lang={lang} />
        <ShowcasePeerEvaluation lang={lang} />
        <Features lang={lang} />
        <Pricing
          lang={lang}
          currency={currency}
          priceDisplay={price.display}
          equivalents={equivalents}
        />
        <Testimonial lang={lang} />
        <FAQ lang={lang} />
        <FinalCta lang={lang} />
      </main>
      <FullFooter lang={lang} />
    </>
  );
}

export async function generateMetadata() {
  const jar = await cookies();
  const lang: AppLanguage =
    jar.get('preferred_lang')?.value === 'fr' ? 'fr' : 'en';
  return {
    description: `${t('landing.hero.subtitle', lang)} ${t('landing.tagline', lang)}`,
  };
}
