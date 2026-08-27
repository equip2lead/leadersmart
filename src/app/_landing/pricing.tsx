import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import type { CurrencyCode } from '@/lib/currency';
import { CurrencySelector } from './currency-selector';

// Single-plan pricing card, currency pre-resolved server-side from the
// preferred_currency cookie. Not part of the rebrand brief, but kept on
// the page and repainted so the landing has no indigo left; the section
// and its currency selector are otherwise unchanged.

export function Pricing({
  lang,
  currency,
  priceDisplay,
  equivalents,
}: {
  lang: AppLanguage;
  currency: CurrencyCode;
  priceDisplay: string;
  equivalents: string[];
}) {
  const includes: string[] = [
    'landing.pricing.includes.members',
    'landing.pricing.includes.features',
    'landing.pricing.includes.whatsapp',
    'landing.pricing.includes.languages',
    'landing.pricing.includes.hosting',
    'landing.pricing.includes.support',
  ];

  return (
    <section id="pricing" className="bg-[#F9F4E7] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
            {t('landing.pricing.eyebrow', lang)}
          </p>
          <h2 className="font-manrope mt-3 text-4xl font-black leading-[1.1] tracking-[-0.02em] text-[#1A1E3F] sm:text-5xl lg:text-6xl">
            {t('landing.pricing.title', lang)}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#3D4470] sm:text-lg">
            {t('landing.pricing.subtitle', lang)}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl overflow-hidden rounded-3xl border border-[#1A1E3F]/10 bg-white shadow-xl shadow-[#1A1E3F]/5">
          <span aria-hidden="true" className="block h-2 bg-[#EFCB4A]" />
          <div className="p-8 sm:p-12">
            <div className="text-center">
              <p className="font-manrope text-7xl font-black tracking-tight text-[#1A1E3F] sm:text-8xl">
                {priceDisplay}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#3D4470]">
                {currency} · {t('landing.pricing.perMonth', lang)}
              </p>
              {equivalents.length > 0 && (
                <p className="mt-3 text-xs text-[#3D4470]/80">
                  {t('landing.pricing.equivPrefix', lang)}{' '}
                  {equivalents.join(' · ')}
                  {t('landing.pricing.equivBased', lang)}
                </p>
              )}
              <div className="mt-4 flex justify-center">
                <CurrencySelector current={currency} lang={lang} />
              </div>
            </div>

            <div className="my-8 h-px bg-[#1A1E3F]/10" />

            <ul className="space-y-3">
              {includes.map((k) => (
                <li
                  key={k}
                  className="flex items-start gap-3 text-sm text-[#3D4470]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FBF3D0]">
                    <Check
                      className="h-3 w-3 text-[#1A1E3F]"
                      aria-hidden="true"
                    />
                  </span>
                  <span>{t(k, lang)}</span>
                </li>
              ))}
            </ul>

            <div className="my-8 h-px bg-[#1A1E3F]/10" />

            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#EFCB4A] px-6 py-4 text-base font-bold text-[#1A1E3F] shadow-lg shadow-[#EFCB4A]/30 transition hover:bg-[#D9B531]"
            >
              {t('landing.pricing.cta', lang)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="mt-4 text-center text-xs text-[#3D4470]/80">
              {t('landing.pricing.ctaFine', lang)}
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-[#3D4470]/80">
          {t('landing.pricing.footnote', lang)}
        </p>
      </div>
    </section>
  );
}
