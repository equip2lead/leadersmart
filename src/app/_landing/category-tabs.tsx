'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

type Tab = { id: string; labelKey: string; anchor: string };

// Each tab anchors to an existing section in page.tsx. Kids Ministry
// doesn't yet have its own dedicated section, so it points at the
// mega-menu-driven Kids Check-In placeholder anchor for Phase 2.
const TABS: Tab[] = [
  { id: 'pastor', labelKey: 'landing.tabs.pastor', anchor: '#features' },
  { id: 'team', labelKey: 'landing.tabs.team', anchor: '#showcase-b' },
  { id: 'rotation', labelKey: 'landing.tabs.rotation', anchor: '#showcase-c' },
  { id: 'kids', labelKey: 'landing.tabs.kids', anchor: '#coming-soon' },
  { id: 'insights', labelKey: 'landing.tabs.insights', anchor: '#features' },
];

// Sticky category-tab bar below the hero. Client-side click updates
// the "active" pill; the anchor href takes care of scrolling.
// Not scroll-linked to section intersection in Phase 2 — the pill just
// shows the last-clicked tab so the user sees a response.
export function CategoryTabs({ lang }: { lang: AppLanguage }) {
  const [active, setActive] = useState<string>(TABS[0].id);

  return (
    <div className="sticky top-16 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-3 sm:px-6">
        <div
          role="tablist"
          className="inline-flex items-center gap-1 overflow-x-auto rounded-full bg-gray-100 p-1 text-sm font-medium"
        >
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <a
                key={tab.id}
                href={tab.anchor}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.id)}
                className={
                  isActive
                    ? 'rounded-full bg-brand-700 px-4 py-1.5 text-white shadow-sm transition'
                    : 'rounded-full px-4 py-1.5 text-gray-500 transition hover:text-gray-900'
                }
              >
                {t(tab.labelKey, lang)}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
