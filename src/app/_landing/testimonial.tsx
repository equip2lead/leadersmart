import { Quote } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Why-Equip2Lead Coach points on the left, the founder quote on the right.
// The quote card wears a short yellow tab on its top edge — a small
// accent that ties the card to the palette without tinting the whole
// surface and hurting the quote's contrast.

export function Testimonial({ lang }: { lang: AppLanguage }) {
  const points = [
    { titleKey: 'landing.why.p1.title', bodyKey: 'landing.why.p1.body' },
    { titleKey: 'landing.why.p2.title', bodyKey: 'landing.why.p2.body' },
    { titleKey: 'landing.why.p3.title', bodyKey: 'landing.why.p3.body' },
  ];

  return (
    <section id="why" className="bg-[#FDFCF7] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
              {t('landing.why.eyebrow', lang)}
            </p>
            <h2 className="font-manrope mt-3 text-4xl font-black leading-[1.1] tracking-[-0.02em] text-[#1A1E3F] sm:text-5xl">
              {t('landing.why.title', lang)}
            </h2>
            <div className="mt-8 space-y-6">
              {points.map((p) => (
                <div key={p.titleKey}>
                  <h3 className="font-manrope text-lg font-extrabold tracking-tight text-[#1A1E3F]">
                    {t(p.titleKey, lang)}
                  </h3>
                  <p className="mt-1.5 text-base leading-relaxed text-[#3D4470]">
                    {t(p.bodyKey, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <figure className="relative overflow-hidden rounded-3xl border border-[#1A1E3F]/10 bg-white p-10 shadow-lg shadow-[#1A1E3F]/5">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-2 bg-[#EFCB4A]"
            />
            <Quote
              className="h-12 w-12 text-[#EFCB4A]"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <blockquote className="mt-4 text-xl font-medium italic leading-relaxed text-[#1A1E3F] sm:text-2xl">
              {t('landing.why.quote', lang)}
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4 border-t border-[#1A1E3F]/10 pt-6">
              <div className="font-manrope flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FBF3D0] text-sm font-black text-[#1A1E3F]">
                DE
              </div>
              <div>
                <p className="text-base font-bold text-[#1A1E3F]">
                  {t('landing.why.name', lang)}
                </p>
                <p className="text-sm text-[#3D4470]">
                  {t('landing.why.role', lang)}
                </p>
              </div>
            </figcaption>
            <p className="mt-4 text-xs text-[#3D4470]/80">
              {t('landing.why.since', lang)}
            </p>
          </figure>
        </div>
      </div>
    </section>
  );
}
