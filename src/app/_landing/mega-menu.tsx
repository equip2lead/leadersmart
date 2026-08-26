'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Baby,
  CalendarCheck,
  ChevronDown,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Flame,
  LayoutGrid,
  MessageSquare,
  Repeat,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

type MegaEntry = {
  href: string;
  icon: LucideIcon;
  nameKey: string;
  taglineKey: string;
};

// Reuses landing.feature.* names for the entries that map 1:1 to the
// features grid; only the tagline keys are dedicated. Kids Check-In,
// Fire Kids, and WhatsApp Native have their own name keys because they
// don't appear in the features grid.
const COL1: MegaEntry[] = [
  { href: '#features', icon: CheckSquare, nameKey: 'landing.feature.sunday.title', taglineKey: 'landing.mega.sunday.tagline' },
  { href: '#features', icon: CalendarCheck, nameKey: 'landing.feature.weekly.title', taglineKey: 'landing.mega.weekly.tagline' },
  { href: '#features', icon: FileText, nameKey: 'landing.feature.monthly.title', taglineKey: 'landing.mega.monthly.tagline' },
  { href: '#features', icon: Award, nameKey: 'landing.feature.potm.title', taglineKey: 'landing.mega.potm.tagline' },
  { href: '#features', icon: ClipboardCheck, nameKey: 'landing.feature.eval.title', taglineKey: 'landing.mega.eval.tagline' },
];

const COL2: MegaEntry[] = [
  { href: '#features', icon: Users, nameKey: 'landing.feature.team.title', taglineKey: 'landing.mega.team.tagline' },
  { href: '#features', icon: LayoutGrid, nameKey: 'landing.feature.dept.title', taglineKey: 'landing.mega.dept.tagline' },
  { href: '#showcase-c', icon: Repeat, nameKey: 'landing.feature.rotation.title', taglineKey: 'landing.mega.rotation.tagline' },
  { href: '#features', icon: TrendingUp, nameKey: 'landing.feature.insights.title', taglineKey: 'landing.mega.insights.tagline' },
];

const COL3: MegaEntry[] = [
  { href: '#coming-soon', icon: Baby, nameKey: 'landing.mega.kidsCheckin.name', taglineKey: 'landing.mega.kidsCheckin.tagline' },
  { href: '#coming-soon', icon: ShieldCheck, nameKey: 'landing.mega.fireKids.name', taglineKey: 'landing.mega.fireKids.tagline' },
  { href: '#coming-soon', icon: MessageSquare, nameKey: 'landing.mega.whatsapp.name', taglineKey: 'landing.mega.whatsapp.tagline' },
];

// Products mega-menu. Hover-opens on desktop; a small delay on the
// close side prevents flicker when the cursor slips through the gap
// between the trigger and the panel.
export function ProductsMegaMenu({ lang }: { lang: AppLanguage }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-sm font-medium text-body transition hover:text-ink"
      >
        {t('landing.mega.products', lang)}
        <ChevronDown
          className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute left-1/2 top-full z-50 mt-3 w-[min(90vw,900px)] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <MegaColumn titleKey="landing.mega.col1.title" entries={COL1} lang={lang} />
            <MegaColumn titleKey="landing.mega.col2.title" entries={COL2} lang={lang} />
            <MegaColumn titleKey="landing.mega.col3.title" entries={COL3} lang={lang} />
          </div>
          {/* Small footer flourish — flame icon + brand phrase so the panel
              feels intentional, not just a link list. */}
          <div className="mt-8 flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-muted">
            <Flame className="h-3.5 w-3.5 text-flame-600" aria-hidden="true" />
            <span>{t('landing.tagline', lang)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MegaColumn({
  titleKey,
  entries,
  lang,
}: {
  titleKey: string;
  entries: MegaEntry[];
  lang: AppLanguage;
}) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
        {t(titleKey, lang)}
      </p>
      <ul className="space-y-1">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <li key={e.nameKey}>
              <Link
                href={e.href}
                className="group flex items-start gap-3 rounded-lg p-2 -m-2 transition hover:bg-flame-50/50"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-flame-50 text-flame-600 transition group-hover:bg-flame-100">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">
                    {t(e.nameKey, lang)}
                  </span>
                  <span className="block text-xs text-muted">
                    {t(e.taglineKey, lang)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Compact vertical rendering for the mobile hamburger menu. Same data,
// grouped by column but stacked linearly.
export function ProductsMegaMenuMobile({ lang }: { lang: AppLanguage }) {
  const groups: Array<{ titleKey: string; entries: MegaEntry[] }> = [
    { titleKey: 'landing.mega.col1.title', entries: COL1 },
    { titleKey: 'landing.mega.col2.title', entries: COL2 },
    { titleKey: 'landing.mega.col3.title', entries: COL3 },
  ];
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.titleKey}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
            {t(g.titleKey, lang)}
          </p>
          <ul className="space-y-0.5">
            {g.entries.map((e) => (
              <li key={e.nameKey}>
                <Link
                  href={e.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-body hover:bg-gray-50"
                >
                  <e.icon className="h-3.5 w-3.5 text-flame-600" aria-hidden="true" />
                  {t(e.nameKey, lang)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
