import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { Highlight } from './highlight';

// Deep-navy close, lit by a yellow glow from the top-right and a sage
// glow from the bottom-left. The headline highlight stays yellow-on-navy
// text (not white-on-yellow), which is the same pairing the hero uses.

export function FinalCta({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-[#1A1E3F] py-24 text-center sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#EFCB4A]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#A8C79A]/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="font-manrope text-4xl font-black leading-[1.1] tracking-[-0.02em] text-white sm:text-6xl lg:text-7xl">
          {t('landing.finalCta.titlePre', lang)}{' '}
          <Highlight tone="yellow" variant="block">
            <span className="text-[#1A1E3F]">
              {t('landing.finalCta.titleHighlight', lang)}
            </span>
          </Highlight>
          {t('landing.finalCta.titleSuffix', lang)}
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70 sm:text-xl">
          {t('landing.finalCta.subtitle', lang)}
        </p>

        <Link
          href="/signup"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-[#EFCB4A] px-10 py-5 text-lg font-bold text-[#1A1E3F] shadow-xl shadow-[#EFCB4A]/20 transition hover:bg-[#D9B531]"
        >
          {t('landing.finalCta.button', lang)}
          <span aria-hidden="true">→</span>
        </Link>

        <p className="mt-5 text-sm text-white/60">
          {t('landing.finalCta.fine', lang)}
        </p>
      </div>
    </section>
  );
}
