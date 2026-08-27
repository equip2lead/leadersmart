'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { LangToggle } from './lang-toggle';
import { Wordmark } from './wordmark';
import { AppIcon } from './app-icon';

// Floating rounded-pill header. Sits ~24px below the viewport top on
// desktop, so it reads as a UI chip on top of the hero rather than a
// heavy bar. Adds a subtle backdrop-blur once the user scrolls past the
// hero fold. Product / Resources carry chevron affordances for future
// dropdowns; for now they anchor-scroll to features / FAQ so they never
// fire a dead click.
//
// Below `sm` the wordmark is swapped for the compact AppIcon — at 375px
// the full lockup plus the CTA leaves no room for either to breathe.
export function LandingHeader({ lang }: { lang: AppLanguage }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks: Array<{
    href: string;
    labelKey: string;
    withChevron?: boolean;
  }> = [
    { href: '#features', labelKey: 'landing.nav.product', withChevron: true },
    { href: '#faq', labelKey: 'landing.nav.resources', withChevron: true },
    { href: '#pricing', labelKey: 'landing.nav.pricing' },
    { href: '#coming-soon', labelKey: 'landing.nav.download' },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-6">
      <div className="mx-auto max-w-6xl">
        <div
          className={
            'pointer-events-auto flex items-center justify-between rounded-full border border-[#1A1E3F]/10 px-3 py-2.5 shadow-lg shadow-[#1A1E3F]/5 transition sm:px-6 ' +
            (scrolled ? 'bg-[#FDFCF7]/90 backdrop-blur-md' : 'bg-white')
          }
        >
          <Link href="/" className="flex items-center" aria-label="LeaderSmart">
            <span className="sm:hidden">
              <AppIcon />
            </span>
            <span className="hidden sm:inline">
              <Wordmark size="sm" />
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.labelKey}
                href={l.href}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-[#3D4470] transition hover:bg-[#F9F4E7] hover:text-[#1A1E3F]"
              >
                {t(l.labelKey, lang)}
                {l.withChevron && (
                  <ChevronDown
                    className="h-3.5 w-3.5 text-[#3D4470]/50"
                    aria-hidden="true"
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LangToggle current={lang} />
            <Link
              href="/login"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-[#3D4470] transition hover:text-[#1A1E3F]"
            >
              {t('landing.nav.signIn', lang)}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#EFCB4A] px-5 py-2 text-sm font-bold text-[#1A1E3F] transition hover:bg-[#D9B531]"
            >
              {t('landing.nav.signUp', lang)}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((s) => !s)}
            className="rounded-full p-2 text-[#1A1E3F] md:hidden"
            aria-label={
              menuOpen
                ? t('landing.nav.menuClose', lang)
                : t('landing.nav.menuOpen', lang)
            }
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="pointer-events-auto mt-2 rounded-2xl border border-[#1A1E3F]/10 bg-white p-3 shadow-xl md:hidden">
            <ul className="space-y-0.5">
              {navLinks.map((l) => (
                <li key={l.labelKey}>
                  <Link
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-[#3D4470] hover:bg-[#F9F4E7] hover:text-[#1A1E3F]"
                  >
                    {t(l.labelKey, lang)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-[#1A1E3F]/10 pt-3">
              <LangToggle current={lang} />
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[#3D4470]"
                >
                  {t('landing.nav.signIn', lang)}
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-[#EFCB4A] px-4 py-1.5 text-sm font-bold text-[#1A1E3F]"
                >
                  {t('landing.nav.signUp', lang)}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
