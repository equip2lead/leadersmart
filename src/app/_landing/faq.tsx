import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Native <details> accordion — no JS, no client boundary, and the
// answers stay in the HTML for search engines.

export function FAQ({ lang }: { lang: AppLanguage }) {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <section id="faq" className="bg-[#FDFCF7] py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
            {t('landing.faq.eyebrow', lang)}
          </p>
          <h2 className="font-manrope mt-3 text-4xl font-black leading-[1.1] tracking-[-0.02em] text-[#1A1E3F] sm:text-5xl">
            {t('landing.faq.title', lang)}
          </h2>
        </div>

        <div className="mt-12 divide-y divide-[#1A1E3F]/10 overflow-hidden rounded-2xl border border-[#1A1E3F]/10 bg-white">
          {items.map((n) => (
            <details key={n} className="group px-6 py-5 open:pb-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-manrope text-lg font-extrabold tracking-tight text-[#1A1E3F]">
                  {t(`landing.faq.q${n}`, lang)}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FBF3D0] text-xl text-[#1A1E3F] transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-base leading-relaxed text-[#3D4470]">
                {t(`landing.faq.a${n}`, lang)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
