import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CalendarCheck,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Flame,
  LayoutGrid,
  Linkedin,
  Quote,
  Repeat,
  TrendingUp,
  Twitter,
  Users,
  Youtube,
  type LucideIcon,
} from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import {
  alternateDisplays,
  isCurrencyCode,
  priceFor,
  type CurrencyCode,
} from '@/lib/currency';
import { LandingHeader } from './_landing/header';
import { CategoryTabs } from './_landing/category-tabs';
import { CurrencySelector } from './_landing/currency-selector';

export const dynamic = 'force-dynamic';

// Full marketing landing page (Phase 1 + Phase 2). Server component
// that reads preferred_lang + preferred_currency cookies (set by the
// middleware on first visit) and renders every section
// pre-translated / pre-priced. Interactive bits live in
// src/app/_landing/*.

export default async function LandingPage() {
  const jar = await cookies();
  const langCookie = jar.get('preferred_lang')?.value;
  const lang: AppLanguage = langCookie === 'fr' ? 'fr' : 'en';

  const currencyCookie = jar.get('preferred_currency')?.value;
  const currency: CurrencyCode =
    currencyCookie && isCurrencyCode(currencyCookie) ? currencyCookie : 'USD';
  const price = priceFor(currency);
  const equivalents = alternateDisplays(currency);

  return (
    <>
      <LandingHeader lang={lang} />
      <main>
        <Hero lang={lang} />
        <CategoryTabs lang={lang} />
        <SocialProof lang={lang} />
        <Features lang={lang} />
        <Problem lang={lang} />
        <HowItWorks lang={lang} />
        <ProductShowcase lang={lang} />
        <Pricing
          lang={lang}
          currency={currency}
          priceDisplay={price.display}
          equivalents={equivalents}
        />
        <Why lang={lang} />
        <FAQ lang={lang} />
        <FinalCta lang={lang} />
      </main>
      <FullFooter lang={lang} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero — Fraunces headline, pastel-mint mockup, subtle rotation
// ─────────────────────────────────────────────────────────────

function Hero({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-brand-700 text-white">
      {/* Radial-dot grain overlay at ~4% opacity — Vercel/Stripe style
          analog warmth on the deep navy field. Same recipe as the
          Final CTA so the "navy bookend" reads as intentional. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
      />
      {/* Flame blob top-right for warm counter-note against the navy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-flame-500/15 blur-3xl"
      />
      <div className="relative mx-auto grid min-h-[85vh] max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-5 lg:gap-16 lg:py-24">
        <div className="lg:col-span-3">
          <span className="inline-flex max-w-full items-center rounded-full border border-flame-400/30 bg-flame-500/20 px-3 py-1 text-xs font-semibold text-flame-200">
            <span className="whitespace-normal">
              {t('landing.hero.pill', lang)}
            </span>
          </span>
          <h1 className="mt-6 font-fraunces text-5xl font-medium leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-[6rem]">
            {t('landing.hero.title', lang)}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-300 sm:text-xl">
            {t('landing.hero.subtitle', lang)}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-flame-600/30 transition hover:bg-flame-700"
            >
              {t('landing.hero.ctaPrimary', lang)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {t('landing.hero.ctaSecondary', lang)}
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            {t('landing.hero.ctaFine', lang)}
          </p>
        </div>

        {/* Mint gradient container glows against the navy field. Larger
            navy-tinted shadow adds lift.
            TODO: replace inner white block with a real admin dashboard
            screenshot (light-mode variant since container is pastel). */}
        <div className="lg:col-span-2">
          <div className="relative rounded-[32px] bg-gradient-to-br from-[#d1fae5] to-[#a7f3d0] p-6 shadow-2xl shadow-brand-900/50 sm:p-8">
            <div
              className="aspect-[4/3] rotate-1 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-emerald-900/10"
              role="img"
              aria-label={t('landing.hero.mockAlt', lang)}
            >
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
// Social proof — thin off-white strip
// ─────────────────────────────────────────────────────────────

function SocialProof({ lang }: { lang: AppLanguage }) {
  // TODO: replace with real ministries as they onboard.
  const churches = [
    'Fire Church · Cameroon',
    'Grace Community · UK',
    'New Hope Chapel · USA',
    'Elim Ministries · Kenya',
    'Covenant Fellowship · Ghana',
    'Living Waters · Nigeria',
  ];
  return (
    <section className="border-b border-gray-100 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {t('landing.social.label', lang)}
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          {churches.map((c, i) => (
            <li key={c} className="flex items-center gap-6">
              <span>{c}</span>
              {i < churches.length - 1 && (
                <span aria-hidden="true" className="text-gray-300">
                  ·
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Features — 9-card grid (unchanged from Phase 1)
// ─────────────────────────────────────────────────────────────

type FeatureDef = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  comingSoon?: boolean;
};

const FEATURES: FeatureDef[] = [
  { icon: CheckSquare, titleKey: 'landing.feature.sunday.title', descKey: 'landing.feature.sunday.desc' },
  { icon: CalendarCheck, titleKey: 'landing.feature.weekly.title', descKey: 'landing.feature.weekly.desc' },
  { icon: FileText, titleKey: 'landing.feature.monthly.title', descKey: 'landing.feature.monthly.desc' },
  { icon: Award, titleKey: 'landing.feature.potm.title', descKey: 'landing.feature.potm.desc' },
  { icon: ClipboardCheck, titleKey: 'landing.feature.eval.title', descKey: 'landing.feature.eval.desc' },
  { icon: Users, titleKey: 'landing.feature.team.title', descKey: 'landing.feature.team.desc' },
  { icon: LayoutGrid, titleKey: 'landing.feature.dept.title', descKey: 'landing.feature.dept.desc' },
  { icon: TrendingUp, titleKey: 'landing.feature.insights.title', descKey: 'landing.feature.insights.desc' },
  { icon: Repeat, titleKey: 'landing.feature.rotation.title', descKey: 'landing.feature.rotation.desc', comingSoon: true },
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
// Problem — two column, peach mockup on the right
// ─────────────────────────────────────────────────────────────

function Problem({ lang }: { lang: AppLanguage }) {
  return (
    // #fef9e7 is the full-opacity twin of #fef3c7/50 — same honey tint
    // but stable across browsers that render alpha inconsistently on
    // long scrolls. Body text at gray-700 hits ~11:1 against it.
    <section className="bg-[#fef9e7] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              {t('landing.problem.eyebrow', lang)}
            </p>
            <h2 className="mt-3 font-fraunces text-4xl font-medium leading-tight tracking-tight text-brand-700 sm:text-5xl lg:text-6xl">
              {t('landing.problem.title', lang)}
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-gray-700">
              <p>{t('landing.problem.p1', lang)}</p>
              <p>{t('landing.problem.p2', lang)}</p>
              <p className="font-semibold text-ink">
                {t('landing.problem.p3', lang)}
              </p>
            </div>
          </div>

          {/* TODO: swap for an Unsplash "church congregation worship"
              photograph. Keeping the peach gradient container is a
              deliberate design token — the photo just sits inside it. */}
          <div className="lg:col-span-2">
            <div className="rounded-[32px] bg-gradient-to-br from-[#fed7aa] to-[#fdba74] p-6 sm:p-8">
              <div
                className="aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-orange-200 to-orange-300 shadow-2xl shadow-orange-900/10"
                role="img"
                aria-label={t('landing.problem.imageAlt', lang)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// How It Works — three numbered steps with chevron separators
// ─────────────────────────────────────────────────────────────

function HowItWorks({ lang }: { lang: AppLanguage }) {
  const steps = [
    { n: '01', titleKey: 'landing.how.step1.title', bodyKey: 'landing.how.step1.body' },
    { n: '02', titleKey: 'landing.how.step2.title', bodyKey: 'landing.how.step2.body' },
    { n: '03', titleKey: 'landing.how.step3.title', bodyKey: 'landing.how.step3.body' },
  ];
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#ecfdf5] to-[#f0fdf4] py-20 sm:py-24">
      {/* Cool mint blob accent, top-right. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            {t('landing.how.eyebrow', lang)}
          </p>
          <h2 className="mt-3 font-fraunces text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            {t('landing.how.title', lang)}
          </h2>
        </div>

        <div className="mt-16 grid items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-6">
          {steps.map((s, i) => (
            <>
              <div key={s.n}>
                <p className="font-fraunces text-7xl font-medium leading-none text-flame-600/30 sm:text-[7rem]">
                  {s.n}
                </p>
                <h3 className="mt-4 font-fraunces text-2xl font-medium text-brand-700">
                  {t(s.titleKey, lang)}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-gray-600">
                  {t(s.bodyKey, lang)}
                </p>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight
                  key={`sep-${s.n}`}
                  className="hidden h-8 w-8 self-center text-gray-300 md:block"
                  aria-hidden="true"
                />
              )}
            </>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Product Showcase — three alternating deeper blocks
// ─────────────────────────────────────────────────────────────

type ShowcaseBlock = {
  id: string;
  // Per-block section background — alternating tints for visual rhythm
  // between the deeper product blocks. Mockup pastel gradients are
  // separate (see `gradient` below) and unaffected.
  sectionBg: string;
  side: 'left-content' | 'right-content';
  gradient: string;
  rotate: string;
  eyebrowKey: string;
  titleKey: string;
  bodyKey: string;
  bulletKeys: string[];
  mockAltKey: string;
  badgeKey?: string;
};

const SHOWCASE_BLOCKS: ShowcaseBlock[] = [
  {
    id: 'showcase-a',
    // Very pale lavender stage — echoes the mockup's darker lavender
    // gradient without competing for attention.
    sectionBg: 'bg-[#faf5ff]',
    side: 'left-content',
    gradient: 'bg-gradient-to-br from-[#e9d5ff] to-[#d8b4fe]',
    rotate: 'rotate-1',
    eyebrowKey: 'landing.showcase.a.eyebrow',
    titleKey: 'landing.showcase.a.title',
    bodyKey: 'landing.showcase.a.body',
    bulletKeys: [
      'landing.showcase.a.bullet1',
      'landing.showcase.a.bullet2',
      'landing.showcase.a.bullet3',
      'landing.showcase.a.bullet4',
    ],
    mockAltKey: 'landing.showcase.a.mockAlt',
  },
  {
    id: 'showcase-b',
    // Pale peach stage — echoes the peach mockup.
    sectionBg: 'bg-[#fff7ed]',
    side: 'right-content',
    gradient: 'bg-gradient-to-br from-[#fed7aa] to-[#fdba74]',
    rotate: '-rotate-1',
    eyebrowKey: 'landing.showcase.b.eyebrow',
    titleKey: 'landing.showcase.b.title',
    bodyKey: 'landing.showcase.b.body',
    bulletKeys: [
      'landing.showcase.b.bullet1',
      'landing.showcase.b.bullet2',
      'landing.showcase.b.bullet3',
      'landing.showcase.b.bullet4',
    ],
    mockAltKey: 'landing.showcase.b.mockAlt',
  },
  {
    id: 'showcase-c',
    // Pale sky stage — echoes the sky mockup.
    sectionBg: 'bg-[#eff6ff]',
    side: 'left-content',
    gradient: 'bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe]',
    rotate: 'rotate-1',
    eyebrowKey: 'landing.showcase.c.eyebrow',
    titleKey: 'landing.showcase.c.title',
    bodyKey: 'landing.showcase.c.body',
    bulletKeys: [
      'landing.showcase.c.bullet1',
      'landing.showcase.c.bullet2',
      'landing.showcase.c.bullet3',
      'landing.showcase.c.bullet4',
    ],
    mockAltKey: 'landing.showcase.c.mockAlt',
    badgeKey: 'landing.showcase.c.badge',
  },
];

function ProductShowcase({ lang }: { lang: AppLanguage }) {
  return (
    <div id="product-showcase">
      {SHOWCASE_BLOCKS.map((block) => (
        <section
          key={block.id}
          id={block.id}
          className={`${block.sectionBg} py-24 sm:py-28`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div
              className={
                'grid items-center gap-12 lg:grid-cols-5 lg:gap-16 ' +
                (block.side === 'right-content' ? 'lg:[&>*:first-child]:order-2' : '')
              }
            >
              <div className="lg:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flame-600">
                  {t(block.eyebrowKey, lang)}
                </p>
                <h3 className="mt-3 font-fraunces text-3xl font-medium leading-tight tracking-tight text-brand-700 sm:text-4xl lg:text-[2.75rem]">
                  {t(block.titleKey, lang)}
                </h3>
                <p className="mt-5 text-lg leading-relaxed text-gray-600">
                  {t(block.bodyKey, lang)}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {block.bulletKeys.map((k) => (
                    <li key={k} className="flex items-start gap-3 text-[15px] text-gray-700">
                      <Check
                        className="mt-0.5 h-5 w-5 shrink-0 text-flame-600"
                        aria-hidden="true"
                      />
                      <span>{t(k, lang)}</span>
                    </li>
                  ))}
                </ul>
                {block.badgeKey && (
                  <span className="mt-6 inline-flex items-center rounded-full bg-flame-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-flame-700">
                    {t(block.badgeKey, lang)}
                  </span>
                )}
              </div>

              {/* Mockup column. TODO: swap the inner white block for a
                  real product screenshot per block. */}
              <div className="lg:col-span-2">
                <div className={`relative rounded-[32px] ${block.gradient} p-6 sm:p-8`}>
                  <div
                    className={`aspect-[4/3] ${block.rotate} overflow-hidden rounded-2xl bg-white shadow-2xl`}
                    role="img"
                    aria-label={t(block.mockAltKey, lang)}
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gray-400">
                        Product preview
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pricing — currency-detected card
// ─────────────────────────────────────────────────────────────

function Pricing({
  lang,
  currency,
  priceDisplay,
  equivalents,
}: {
  lang: AppLanguage;
  currency: CurrencyCode;
  priceDisplay: string;
  equivalents: string[];
}) {
  const includes: string[] = [
    'landing.pricing.includes.members',
    'landing.pricing.includes.features',
    'landing.pricing.includes.whatsapp',
    'landing.pricing.includes.languages',
    'landing.pricing.includes.hosting',
    'landing.pricing.includes.support',
  ];
  return (
    // Honey wash at the top and bottom of the section, near-white
    // through the middle where the pricing card actually sits — so the
    // card reads as a spotlight rather than a shape floating on a solid
    // tint. /50 alpha keeps the honey readable-but-warm.
    <section
      id="pricing"
      className="bg-gradient-to-b from-[#fef3c7]/40 via-white to-[#fef3c7]/40 py-24 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flame-600">
            {t('landing.pricing.eyebrow', lang)}
          </p>
          <h2 className="mt-3 font-fraunces text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            {t('landing.pricing.title', lang)}
          </h2>
          <p className="mt-4 text-base text-gray-600 sm:text-lg">
            {t('landing.pricing.subtitle', lang)}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-xl sm:p-12">
          <div className="text-center">
            <p className="font-fraunces text-7xl font-medium tracking-tight text-brand-700 sm:text-8xl">
              {priceDisplay}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              {currency} · {t('landing.pricing.perMonth', lang)}
            </p>
            {equivalents.length > 0 && (
              <p className="mt-3 text-xs text-muted">
                {t('landing.pricing.equivPrefix', lang)} {equivalents.join(' · ')}
                {t('landing.pricing.equivBased', lang)}
              </p>
            )}
            <div className="mt-4 flex justify-center">
              <CurrencySelector current={currency} lang={lang} />
            </div>
          </div>

          <div className="my-8 h-px bg-gray-200" />

          <ul className="space-y-3">
            {includes.map((k) => (
              <li key={k} className="flex items-start gap-3 text-sm text-body">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-flame-600"
                  aria-hidden="true"
                />
                <span>{t(k, lang)}</span>
              </li>
            ))}
          </ul>

          <div className="my-8 h-px bg-gray-200" />

          <Link
            href="/signup"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-flame-700"
          >
            {t('landing.pricing.cta', lang)}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-4 text-center text-xs text-muted">
            {t('landing.pricing.ctaFine', lang)}
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-muted">
          {t('landing.pricing.footnote', lang)}
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Why LeaderSmart — three-point column + testimonial
// ─────────────────────────────────────────────────────────────

function Why({ lang }: { lang: AppLanguage }) {
  const points = [
    { titleKey: 'landing.why.p1.title', bodyKey: 'landing.why.p1.body' },
    { titleKey: 'landing.why.p2.title', bodyKey: 'landing.why.p2.body' },
    { titleKey: 'landing.why.p3.title', bodyKey: 'landing.why.p3.body' },
  ];
  return (
    <section id="why" className="bg-[#fef2f2] py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flame-600">
              {t('landing.why.eyebrow', lang)}
            </p>
            <h2 className="mt-3 font-fraunces text-4xl font-medium leading-tight tracking-tight text-brand-700 sm:text-5xl">
              {t('landing.why.title', lang)}
            </h2>
            <div className="mt-8 space-y-6">
              {points.map((p) => (
                <div key={p.titleKey}>
                  <h3 className="font-fraunces text-xl font-medium text-ink">
                    {t(p.titleKey, lang)}
                  </h3>
                  <p className="mt-1.5 text-base leading-relaxed text-gray-600">
                    {t(p.bodyKey, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <figure className="rounded-3xl border border-rose-100 bg-white p-10 shadow-lg shadow-rose-900/5">
            <Quote
              className="h-16 w-16 text-flame-600"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <blockquote className="mt-4 font-fraunces text-2xl font-medium italic leading-relaxed text-gray-800">
              {t('landing.why.quote', lang)}
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4 border-t border-gray-200 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                DE
              </div>
              <div>
                <p className="text-base font-semibold text-ink">
                  {t('landing.why.name', lang)}
                </p>
                <p className="text-sm text-gray-600">
                  {t('landing.why.role', lang)}
                </p>
              </div>
            </figcaption>
            <p className="mt-4 text-xs text-gray-500">
              {t('landing.why.since', lang)}
            </p>
          </figure>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// FAQ — native <details> so no client JS
// ─────────────────────────────────────────────────────────────

function FAQ({ lang }: { lang: AppLanguage }) {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <section className="bg-[#f5f3ff] py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flame-600">
            {t('landing.faq.eyebrow', lang)}
          </p>
          <h2 className="mt-3 font-fraunces text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
            {t('landing.faq.title', lang)}
          </h2>
        </div>

        <div className="mt-12 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
          {items.map((n) => (
            <details key={n} className="group px-6 py-5 open:pb-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-fraunces text-xl font-medium text-ink">
                  {t(`landing.faq.q${n}`, lang)}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-muted transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-base leading-relaxed text-gray-600">
                {t(`landing.faq.a${n}`, lang)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Final CTA — dark navy, huge Fraunces headline
// ─────────────────────────────────────────────────────────────

function FinalCta({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-brand-700 py-24 text-center text-white sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
      />
      {/* Flame blob top-left — warm counter-note against the navy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-flame-500/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="font-fraunces text-4xl font-medium leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          {t('landing.finalCta.title', lang)}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-300 sm:text-xl">
          {t('landing.finalCta.subtitle', lang)}
        </p>
        <Link
          href="/signup"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-flame-600 px-10 py-5 text-lg font-semibold text-white shadow-lg transition hover:bg-flame-700"
        >
          {t('landing.finalCta.button', lang)}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="mt-5 text-sm text-gray-400">
          {t('landing.finalCta.fine', lang)}
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Full footer — brand-800 with 4 columns
// ─────────────────────────────────────────────────────────────

function FullFooter({ lang }: { lang: AppLanguage }) {
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
    { href: '#coming-soon', labelKey: 'landing.footer.social.linkedin', icon: Linkedin },
    { href: '#coming-soon', labelKey: 'landing.footer.social.twitter', icon: Twitter },
    { href: '#coming-soon', labelKey: 'landing.footer.social.youtube', icon: Youtube },
  ];

  return (
    <footer className="bg-brand-800 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Wide brand column — 2 of 5 on desktop. */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-flame-500" aria-hidden="true" />
              <span className="font-fraunces text-2xl font-semibold text-brand-100">
                LeaderSmart
              </span>
            </div>
            <p className="mt-3 font-fraunces text-lg italic text-gray-300">
              {t('landing.tagline', lang)}
            </p>
            <p className="mt-4 max-w-md text-sm text-gray-400">
              {t('landing.footer.about', lang)}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socials.map((s) => (
                <Link
                  key={s.labelKey}
                  href={s.href}
                  aria-label={t(s.labelKey, lang)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-700 text-gray-300 transition hover:border-flame-500 hover:text-white"
                >
                  <s.icon className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
            <p className="mt-6 text-xs text-gray-500">
              {t('landing.footer.copyright', lang)}
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.titleKey}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white">
                {t(col.titleKey, lang)}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {col.items.map((l) => (
                  <li key={l.labelKey}>
                    <Link
                      href={l.href}
                      className="text-gray-400 transition hover:text-white"
                    >
                      {t(l.labelKey, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-brand-700 pt-6 text-center text-xs text-gray-500">
          {t('landing.footer.bottom', lang)}
        </div>
      </div>
    </footer>
  );
}
