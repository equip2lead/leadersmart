import { HeartHandshake, Sparkles, Tag, type LucideIcon } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Three promises, one per brand tile colour — yellow, navy, sage. The
// rotation is the point: it shows the whole palette in a single row
// before the reader meets it section by section further down.
const METRICS: Array<{
  icon: LucideIcon;
  labelKey: string;
  tile: string;
}> = [
  {
    icon: Sparkles,
    labelKey: 'landing.metric.updates',
    tile: 'bg-[#EFCB4A] text-[#1A1E3F]',
  },
  {
    icon: Tag,
    labelKey: 'landing.metric.pricing',
    tile: 'bg-[#1A1E3F] text-[#EFCB4A]',
  },
  {
    icon: HeartHandshake,
    labelKey: 'landing.metric.founders',
    tile: 'bg-[#A8C79A] text-[#1A1E3F]',
  },
];

export function MetricStrip({ lang }: { lang: AppLanguage }) {
  return (
    <section className="bg-[#F9F4E7] py-14 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {METRICS.map((m) => (
            <li
              key={m.labelKey}
              className="flex items-center gap-4 sm:flex-col sm:gap-3 sm:text-center"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${m.tile}`}
              >
                <m.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="font-manrope text-base font-extrabold tracking-tight text-[#1A1E3F]">
                {t(m.labelKey, lang)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
