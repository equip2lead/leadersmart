import Link from 'next/link';
import {
  Flame,
  ArrowRight,
  ClipboardCheck,
  Users,
  Baby,
  MessageCircle,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/lib/i18n';

type Feature = {
  key: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
};

const features: Feature[] = [
  {
    key: 'pastor',
    icon: ClipboardCheck,
    titleKey: 'landing.feature.pastor.title',
    descKey: 'landing.feature.pastor.desc',
  },
  {
    key: 'dept',
    icon: Users,
    titleKey: 'landing.feature.dept.title',
    descKey: 'landing.feature.dept.desc',
  },
  {
    key: 'kids',
    icon: Baby,
    titleKey: 'landing.feature.kids.title',
    descKey: 'landing.feature.kids.desc',
  },
  {
    key: 'whatsapp',
    icon: MessageCircle,
    titleKey: 'landing.feature.whatsapp.title',
    descKey: 'landing.feature.whatsapp.desc',
  },
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    titleKey: 'landing.feature.dashboard.title',
    descKey: 'landing.feature.dashboard.desc',
  },
];

export default function LandingPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-flame-600" aria-hidden="true" />
            <span className="text-lg font-bold text-ink">LeaderSmart</span>
          </Link>
          <Link href="/login" className="btn-secondary !py-2 !px-4 text-sm">
            Sign In
          </Link>
        </div>
      </header>

      <main>
        <section className="px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-flame-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-flame-700">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {t('landing.hero.badge')}
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-ink sm:text-5xl md:text-6xl">
              {t('landing.hero.title')}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-body sm:text-lg">
              {t('landing.hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary w-full sm:w-auto">
                {t('landing.hero.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="btn-secondary w-full sm:w-auto">
                {t('landing.hero.demo')}
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                {t('landing.features.title')}
              </h2>
              <p className="mt-4 text-base text-body">
                {t('landing.features.subtitle')}
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.key} className="card">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <f.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    {t(f.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm text-body">{t(f.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl rounded-2xl bg-brand-700 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
              {t('landing.cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-brand-100 sm:text-base">
              {t('landing.cta.subtitle')}
            </p>
            <Link href="/signup" className="btn-flame mt-8 inline-flex">
              {t('landing.cta.button')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 px-4 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted">
          © 2026 LeaderSmart by ChurchSmart · DigiSmart Africa
        </div>
      </footer>
    </>
  );
}
