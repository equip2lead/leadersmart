import {
  Award,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  Repeat,
  Sprout,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

type FeatureDef = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  comingSoon?: boolean;
};

// Nine modules. Icon tiles rotate yellow-soft / sage-soft / navy across
// the grid so the 3×3 doesn't read as nine identical cards.
const FEATURES: FeatureDef[] = [
  {
    icon: CheckSquare,
    titleKey: 'landing.feature.sunday.title',
    descKey: 'landing.feature.sunday.desc',
  },
  {
    icon: CalendarCheck,
    titleKey: 'landing.feature.weekly.title',
    descKey: 'landing.feature.weekly.desc',
  },
  {
    icon: FileText,
    titleKey: 'landing.feature.monthly.title',
    descKey: 'landing.feature.monthly.desc',
  },
  {
    icon: Award,
    titleKey: 'landing.feature.potm.title',
    descKey: 'landing.feature.potm.desc',
  },
  {
    icon: ClipboardCheck,
    titleKey: 'landing.feature.eval.title',
    descKey: 'landing.feature.eval.desc',
  },
  {
    icon: Users,
    titleKey: 'landing.feature.team.title',
    descKey: 'landing.feature.team.desc',
  },
  {
    icon: LayoutGrid,
    titleKey: 'landing.feature.dept.title',
    descKey: 'landing.feature.dept.desc',
  },
  {
    icon: Sprout,
    titleKey: 'landing.feature.growth.title',
    descKey: 'landing.feature.growth.desc',
  },
  {
    icon: Repeat,
    titleKey: 'landing.feature.rotation.title',
    descKey: 'landing.feature.rotation.desc',
    comingSoon: true,
  },
];

const TILES = [
  'bg-[#FBF3D0] text-[#1A1E3F]',
  'bg-[#D8E5D0] text-[#1A1E3F]',
  'bg-[#1A1E3F] text-[#EFCB4A]',
];

export function Features({ lang }: { lang: AppLanguage }) {
  return (
    <section id="features" className="bg-[#F9F4E7] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
            {t('landing.features.eyebrow', lang)}
          </p>
          <h2 className="font-manrope mt-3 text-4xl font-black leading-[1.1] tracking-[-0.02em] text-[#1A1E3F] sm:text-5xl lg:text-6xl">
            {t('landing.features.title', lang)}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[#3D4470] sm:text-lg">
            {t('landing.features.subtitle', lang)}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.titleKey}
              className="rounded-2xl border border-[#1A1E3F]/10 bg-white p-6"
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${TILES[i % TILES.length]}`}
              >
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-manrope mt-5 flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-[#1A1E3F]">
                {t(f.titleKey, lang)}
                {f.comingSoon && (
                  <span className="inline-flex items-center rounded-full bg-[#D8E5D0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1A1E3F]">
                    {t('landing.features.comingSoon', lang)}
                  </span>
                )}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#3D4470]">
                {t(f.descKey, lang)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
