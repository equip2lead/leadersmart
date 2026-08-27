'use client';

import { useState } from 'react';
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

// "All your ministry rhythms" — five category tabs over a panel of the
// three capabilities that belong to each. The tabs are wired to real
// state rather than left as decoration: a tab bar that doesn't move
// anything is worse than no tab bar. Panel content reuses the feature
// dictionary entries, so nothing here needs its own translations.

type Entry = { icon: LucideIcon; titleKey: string; descKey: string };

const ENTRY: Record<string, Entry> = {
  sunday: {
    icon: CheckSquare,
    titleKey: 'landing.feature.sunday.title',
    descKey: 'landing.feature.sunday.desc',
  },
  weekly: {
    icon: CalendarCheck,
    titleKey: 'landing.feature.weekly.title',
    descKey: 'landing.feature.weekly.desc',
  },
  monthly: {
    icon: FileText,
    titleKey: 'landing.feature.monthly.title',
    descKey: 'landing.feature.monthly.desc',
  },
  potm: {
    icon: Award,
    titleKey: 'landing.feature.potm.title',
    descKey: 'landing.feature.potm.desc',
  },
  eval: {
    icon: ClipboardCheck,
    titleKey: 'landing.feature.eval.title',
    descKey: 'landing.feature.eval.desc',
  },
  team: {
    icon: Users,
    titleKey: 'landing.feature.team.title',
    descKey: 'landing.feature.team.desc',
  },
  dept: {
    icon: LayoutGrid,
    titleKey: 'landing.feature.dept.title',
    descKey: 'landing.feature.dept.desc',
  },
  growth: {
    icon: Sprout,
    titleKey: 'landing.feature.growth.title',
    descKey: 'landing.feature.growth.desc',
  },
  rotation: {
    icon: Repeat,
    titleKey: 'landing.feature.rotation.title',
    descKey: 'landing.feature.rotation.desc',
  },
};

const TABS: Array<{ id: string; labelKey: string; entries: Entry[] }> = [
  {
    id: 'pastor',
    labelKey: 'landing.tabs.pastor',
    entries: [ENTRY.sunday, ENTRY.weekly, ENTRY.monthly],
  },
  {
    id: 'team',
    labelKey: 'landing.tabs.team',
    entries: [ENTRY.team, ENTRY.dept, ENTRY.potm],
  },
  {
    id: 'rotation',
    labelKey: 'landing.tabs.rotation',
    entries: [ENTRY.rotation, ENTRY.dept, ENTRY.team],
  },
  {
    id: 'growth',
    labelKey: 'landing.tabs.growth',
    entries: [ENTRY.growth, ENTRY.eval, ENTRY.potm],
  },
  {
    id: 'insights',
    labelKey: 'landing.tabs.insights',
    entries: [ENTRY.monthly, ENTRY.growth, ENTRY.dept],
  },
];

export function Rhythms({ lang }: { lang: AppLanguage }) {
  const [active, setActive] = useState(TABS[0].id);
  const panel = TABS.find((tab) => tab.id === active) ?? TABS[0];

  return (
    <section id="rhythms" className="bg-[#FDFCF7] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
            {t('landing.rhythms.eyebrow', lang)}
          </p>
          <h2 className="font-manrope mt-3 text-4xl font-black leading-[1.1] tracking-[-0.02em] text-[#1A1E3F] sm:text-5xl lg:text-6xl">
            {t('landing.rhythms.title', lang)}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[#3D4470] sm:text-lg">
            {t('landing.rhythms.subtitle', lang)}
          </p>
        </div>

        {/* Horizontal scroll below sm rather than wrapping — five tabs
            stacked into three rows reads as a nav menu, not a tab bar. */}
        <div
          role="tablist"
          aria-label={t('landing.rhythms.title', lang)}
          className="mt-12 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0"
        >
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`rhythm-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls="rhythm-panel"
                onClick={() => setActive(tab.id)}
                className={
                  'whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ' +
                  (isActive
                    ? 'bg-[#1A1E3F] text-[#EFCB4A]'
                    : 'text-[#3D4470] hover:bg-[#F9F4E7] hover:text-[#1A1E3F]')
                }
              >
                {t(tab.labelKey, lang)}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id="rhythm-panel"
          aria-labelledby={`rhythm-tab-${panel.id}`}
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {panel.entries.map((entry) => (
            <div
              key={entry.titleKey}
              className="rounded-2xl border border-[#1A1E3F]/10 bg-white p-6"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF3D0] text-[#1A1E3F]">
                <entry.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-manrope mt-5 text-lg font-extrabold tracking-tight text-[#1A1E3F]">
                {t(entry.titleKey, lang)}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#3D4470]">
                {t(entry.descKey, lang)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
