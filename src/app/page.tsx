import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  Repeat,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { LandingHeader } from './_landing/header';

export const dynamic = 'force-dynamic';

// Phase 1 landing page: header + hero + 9-card features grid + minimal
// footer. Longer sections (social proof, problem, how-it-works,
// pricing, testimonial, FAQ, final CTA, full footer) return in Phase 2
// once the mega-menu and category tabs land. Interactive bits (lang
// toggle, mobile menu) live in src/app/_landing/.

export default async function LandingPage() {
  const jar = await cookies();
  const langCookie = jar.get('preferred_lang')?.value;
  const lang: AppLanguage = langCookie === 'fr' ? 'fr' : 'en';

  return (
    <>
      <LandingHeader lang={lang} />
      <main>
        <Hero lang={lang} />
        <Features lang={lang} />
      </main>
      <MinimalFooter lang={lang} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero — Fraunces headline, pastel-mint mockup, subtle rotation
// ─────────────────────────────────────────────────────────────

function Hero({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-[#f5f3ff]">
      <div className="mx-auto grid min-h-[85vh] max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-5 lg:gap-16 lg:py-24">
        {/* Text column — spans 3 of 5 columns on desktop (60%). */}
        <div className="lg:col-span-3">
          <span className="inline-flex max-w-full items-center rounded-full border border-flame-200 bg-flame-100 px-3 py-1 text-xs font-semibold text-flame-700">
            <span className="whitespace-normal">
              {t('landing.hero.pill', lang)}
            </span>
          </span>
          <h1 className="mt-6 font-fraunces text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl xl:text-[6rem]">
            {t('landing.hero.title', lang)}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-xl">
            {t('landing.hero.subtitle', lang)}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-flame-600/20 transition hover:bg-flame-700"
            >
              {t('landing.hero.ctaPrimary', lang)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-4 text-base font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              {t('landing.hero.ctaSecondary', lang)}
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {t('landing.hero.ctaFine', lang)}
          </p>
        </div>

        {/* Product mockup column — spans 2 of 5 columns (40%).
            Pastel-mint gradient container with a rounded white browser
            chrome inside, gently rotated for depth.
            TODO: replace inner white block with a real admin dashboard
            screenshot (light-mode variant since the container is pastel). */}
        <div className="lg:col-span-2">
          <div className="relative rounded-[32px] bg-gradient-to-br from-[#d1fae5] to-[#a7f3d0] p-6 sm:p-8">
            <div
              className="aspect-[4/3] rotate-1 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-900/10"
              role="img"
              aria-label={t('landing.hero.mockAlt', lang)}
            >
              {/* Minimal browser chrome so the placeholder reads as a
                  product surface rather than an empty box. */}
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gray-400">
                  Admin dashboard preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Features — 9 cards, 3×3 grid on desktop
// ─────────────────────────────────────────────────────────────

type FeatureDef = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  comingSoon?: boolean;
};

const FEATURES: FeatureDef[] = [
  // Row 1 — Pastor Workflow
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
  // Row 2 — Team & Leadership
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
  // Row 3 — Operations & Insight
  {
    icon: LayoutGrid,
    titleKey: 'landing.feature.dept.title',
    descKey: 'landing.feature.dept.desc',
  },
  {
    icon: TrendingUp,
    titleKey: 'landing.feature.insights.title',
    descKey: 'landing.feature.insights.desc',
  },
  {
    icon: Repeat,
    titleKey: 'landing.feature.rotation.title',
    descKey: 'landing.feature.rotation.desc',
    comingSoon: true,
  },
];

function Features({ lang }: { lang: AppLanguage }) {
  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flame-600">
            {t('landing.features.eyebrow', lang)}
          </p>
          <h2 className="mt-3 font-fraunces text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            {t('landing.features.title', lang)}
          </h2>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">
            {t('landing.features.subtitle', lang)}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.titleKey}
                className="rounded-2xl border border-gray-200 bg-white p-8"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-flame-50 text-flame-600">
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="mt-5 flex flex-wrap items-center gap-2 font-fraunces text-2xl font-medium text-brand-700">
                  {t(f.titleKey, lang)}
                  {f.comingSoon && (
                    <span className="inline-flex items-center rounded-full bg-flame-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-flame-700">
                      {t('landing.features.comingSoon', lang)}
                    </span>
                  )}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                  {t(f.descKey, lang)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Minimal footer — Phase 1 only; full 4-column footer returns in Phase 2
// ─────────────────────────────────────────────────────────────

function MinimalFooter({ lang }: { lang: AppLanguage }) {
  return (
    <footer className="border-t border-gray-100 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-500 sm:px-6">
        {t('landing.footer.minimal', lang)}
      </div>
    </footer>
  );
}
