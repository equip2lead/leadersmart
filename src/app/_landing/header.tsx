'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Menu, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { LangToggle } from './lang-toggle';
import { ProductsMegaMenu, ProductsMegaMenuMobile } from './mega-menu';

// Sticky marketing header. Products link opens a mega-menu on desktop;
// remaining links (Pricing / Why / Contact) are plain anchors. Mobile
// hamburger reveals a flat menu with the mega-menu items inline.
export function LandingHeader({ lang }: { lang: AppLanguage }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const secondaryLinks: Array<{ href: string; labelKey: string }> = [
    { href: '#pricing', labelKey: 'landing.nav.pricing' },
    { href: '#why', labelKey: 'landing.nav.why' },
    { href: '#coming-soon', labelKey: 'landing.nav.contact' },
  ];

  return (
    <header
      className={
        'sticky top-0 z-40 bg-white transition-all ' +
        (scrolled
          ? 'border-b border-gray-200 py-3 shadow-sm'
          : 'border-b border-transparent py-4')
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-flame-600" aria-hidden="true" />
          <span className="font-fraunces text-2xl font-semibold tracking-tight text-brand-700">
            LeaderSmart
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <ProductsMegaMenu lang={lang} />
          {secondaryLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-body transition hover:text-ink"
            >
              {t(l.labelKey, lang)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LangToggle current={lang} />
          <Link
            href="/login"
            className="text-sm font-semibold text-body transition hover:text-ink"
          >
            {t('landing.nav.signIn', lang)}
          </Link>
          <Link href="/signup" className="btn-flame !py-2 !px-4 text-sm">
            {t('landing.nav.startTrial', lang)}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((s) => !s)}
          className="rounded-lg p-2 text-ink md:hidden"
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
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
            <ProductsMegaMenuMobile lang={lang} />
            <div className="border-t border-gray-100 pt-3">
              <ul className="space-y-0.5">
                {secondaryLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-1.5 text-sm font-medium text-body hover:bg-gray-50"
                    >
                      {t(l.labelKey, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <LangToggle current={lang} />
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-body"
                >
                  {t('landing.nav.signIn', lang)}
                </Link>
                <Link href="/signup" className="btn-flame !py-2 !px-3 text-sm">
                  {t('landing.nav.startTrial', lang)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
