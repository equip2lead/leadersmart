import Link from 'next/link';
import { Linkedin, Twitter, Youtube, type LucideIcon } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { Wordmark } from './wordmark';

// Navy footer. The wordmark runs in `light` tone here — white type, but
// the yellow highlighter bar and period stay yellow, which is what keeps
// the mark recognisable against the dark ground. Column headers are
// yellow; links sit at white/60 and lift to full white on hover.

export function FullFooter({ lang }: { lang: AppLanguage }) {
  const cols: Array<{
    titleKey: string;
    items: Array<{ href: string; labelKey: string }>;
  }> = [
    {
      titleKey: 'landing.footer.col.product',
      items: [
        { href: '#features', labelKey: 'landing.footer.link.features' },
        { href: '#pricing', labelKey: 'landing.footer.link.pricing' },
        { href: '/login', labelKey: 'landing.footer.link.signIn' },
        { href: '/signup', labelKey: 'landing.footer.link.startTrial' },
        { href: '#coming-soon', labelKey: 'landing.footer.link.whatsNew' },
      ],
    },
    {
      titleKey: 'landing.footer.col.company',
      items: [
        { href: '#coming-soon', labelKey: 'landing.footer.link.aboutUs' },
        { href: '#coming-soon', labelKey: 'landing.footer.link.contactUs' },
        { href: '#coming-soon', labelKey: 'landing.footer.link.support' },
        { href: '#coming-soon', labelKey: 'landing.footer.link.blog' },
      ],
    },
    {
      titleKey: 'landing.footer.col.legal',
      items: [
        { href: '#coming-soon', labelKey: 'landing.footer.link.privacy' },
        { href: '#coming-soon', labelKey: 'landing.footer.link.terms' },
        { href: '#coming-soon', labelKey: 'landing.footer.link.dpa' },
        { href: '#coming-soon', labelKey: 'landing.footer.link.security' },
      ],
    },
  ];

  const socials: Array<{ href: string; labelKey: string; icon: LucideIcon }> = [
    {
      href: '#coming-soon',
      labelKey: 'landing.footer.social.linkedin',
      icon: Linkedin,
    },
    {
      href: '#coming-soon',
      labelKey: 'landing.footer.social.twitter',
      icon: Twitter,
    },
    {
      href: '#coming-soon',
      labelKey: 'landing.footer.social.youtube',
      icon: Youtube,
    },
  ];

  return (
    <footer className="bg-[#1A1E3F]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Wordmark size="md" tone="light" />
            <p className="mt-4 text-base italic text-white/80">
              {t('landing.tagline', lang)}
            </p>
            <p className="mt-4 max-w-md text-sm text-white/60">
              {t('landing.footer.about', lang)}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socials.map((s) => (
                <Link
                  key={s.labelKey}
                  href={s.href}
                  aria-label={t(s.labelKey, lang)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white/60 transition hover:border-[#EFCB4A] hover:text-[#EFCB4A]"
                >
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.titleKey}>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#EFCB4A]">
                {t(col.titleKey, lang)}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {col.items.map((l) => (
                  <li key={l.labelKey}>
                    <Link
                      href={l.href}
                      className="text-white/60 transition hover:text-white"
                    >
                      {t(l.labelKey, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-white/10 pt-6 text-center text-xs text-white/50">
          {t('landing.footer.bottom', lang)}
        </div>
      </div>
    </footer>
  );
}
