import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Placeholder ministries — the dot in each label separates the ministry
// from its country and is part of the translated string, so French can
// localise "UK" to "Royaume-Uni" without the component knowing.
// TODO: swap for real ministries as they onboard.
const MINISTRIES = [
  'landing.trust.m1',
  'landing.trust.m2',
  'landing.trust.m3',
  'landing.trust.m4',
  'landing.trust.m5',
];

export function TrustStrip({ lang }: { lang: AppLanguage }) {
  return (
    <section className="bg-[#FDFCF7] py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
          {t('landing.trust.label', lang)}
        </p>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {MINISTRIES.map((k) => (
            <li
              key={k}
              className="flex items-center gap-2 text-sm font-semibold text-[#1A1E3F]/60"
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#EFCB4A]"
              />
              {t(k, lang)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
