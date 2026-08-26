import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CalendarCheck,
  CheckCircle,
  CheckSquare,
  ClipboardCheck,
  FileText,
  Flame,
  LayoutGrid,
  Linkedin,
  Play,
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
import { CurrencySelector } from './_landing/currency-selector';

export const dynamic = 'force-dynamic';

// Full marketing landing (indigo pivot). Reads preferred_lang and
// preferred_currency cookies set by middleware on first visit, then
// renders every section server-side pre-translated + pre-priced. Only
// the header, lang toggle, and currency selector are client components.

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
        <TrustStrip lang={lang} />
        <Streamline lang={lang} />
        <Features lang={lang} />
        <Pricing
          lang={lang}
          currency={currency}
          priceDisplay={price.display}
          equivalents={equivalents}
        />
        <Testimonial lang={lang} />
        <FAQ lang={lang} />
        <FinalCta lang={lang} />
      </main>
      <FullFooter lang={lang} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero — white with indigo gradient wash + floating mockup composition
// ─────────────────────────────────────────────────────────────

function Hero({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/30 to-white pb-16 pt-32 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
      {/* Purple/indigo-to-pink vertical gradient bars on the left and
          right edges — the Klaboard-style accent that anchors the hero
          in the design system without dominating it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-24 bottom-24 hidden w-1 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 opacity-60 md:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-24 bottom-24 hidden w-1 rounded-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 opacity-60 md:block"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10">
        {/* Text column — 7 of 12 (~60%). */}
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
            <Flame className="h-4 w-4" aria-hidden="true" />
            {t('landing.hero.pill', lang)}
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] text-gray-900 sm:text-6xl lg:text-7xl xl:text-[6.5rem]">
            {t('landing.hero.titleLine1', lang)}
            <br />
            {t('landing.hero.titleLine2', lang)}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-gray-600 sm:text-lg">
            {t('landing.hero.subtitle', lang)}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
            >
              {t('landing.hero.ctaPrimary', lang)}
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-transparent px-4 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <Play className="h-4 w-4 fill-gray-900 text-gray-900" aria-hidden="true" />
              </span>
              {t('landing.hero.ctaSecondary', lang)}
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {t('landing.hero.ctaFine', lang)}
          </p>
        </div>

        {/* Mockup composition — 5 of 12 (~40%). Main dashboard card
            with a rotated bar chart, floating "handle multiple
            ministries" badge, and two ministry chips. */}
        <div className="lg:col-span-5">
          <HeroMockup lang={lang} />
        </div>
      </div>
    </section>
  );
}

function HeroMockup({ lang }: { lang: AppLanguage }) {
  // Bar heights are deliberately hand-picked (not derived) so the
  // silhouette looks like a real week-over-week attendance chart, not
  // a Lorem-ipsum four-bar demo.
  // TODO: replace with a real admin dashboard screenshot.
  const bars: Array<{ label: string; height: string; tone: string }> = [
    { label: t('landing.hero.mock.week1', lang), height: '55%', tone: 'bg-indigo-300' },
    { label: t('landing.hero.mock.week2', lang), height: '75%', tone: 'bg-indigo-500' },
    { label: t('landing.hero.mock.week3', lang), height: '62%', tone: 'bg-indigo-400' },
    { label: t('landing.hero.mock.week4', lang), height: '90%', tone: 'bg-indigo-600' },
  ];
  return (
    <div className="relative" aria-label={t('landing.hero.mockAlt', lang)} role="img">
      {/* Main dashboard card — rotated for depth. */}
      <div className="rotate-2 rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl shadow-indigo-900/10 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-gray-900">
              {t('landing.hero.mock.title', lang)}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            +12%
          </span>
        </div>
        <div className="mt-6 flex h-40 items-end justify-between gap-3">
          {bars.map((b) => (
            <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t-lg ${b.tone}`}
                style={{ height: b.height }}
              />
              <span className="text-[10px] font-medium text-gray-500">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating "handle multiple ministries" badge — top-right,
          slight opposite rotation for asymmetric depth. */}
      <div className="absolute -top-6 -right-4 hidden -rotate-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <p className="text-xs font-semibold text-gray-900">
            {t('landing.hero.mock.multiple', lang)}
          </p>
        </div>
      </div>

      {/* Ministry chips stack — bottom-left, slight rotate. */}
      <div className="absolute -bottom-6 -left-4 hidden rotate-1 space-y-2 sm:block">
        <MockChip
          swatch="bg-indigo-500"
          title={t('landing.hero.mock.sundayService', lang)}
          size={t('landing.hero.mock.sundaySize', lang)}
        />
        <MockChip
          swatch="bg-purple-500"
          title={t('landing.hero.mock.wednesdayPrayer', lang)}
          size={t('landing.hero.mock.wednesdaySize', lang)}
        />
      </div>

      {/* Small avatar circle overlapping the top-left of the chart card
          so the composition feels populated. Uses initials, matches the
          testimonial avatar style. */}
      <div className="absolute -top-3 -left-3 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-indigo-100 text-xs font-bold text-indigo-700 shadow-md">
        DE
      </div>
    </div>
  );
}

function MockChip({
  swatch,
  title,
  size,
}: {
  swatch: string;
  title: string;
  size: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-lg">
      <span className={`h-6 w-6 rounded-full ${swatch}`} />
      <div>
        <p className="text-xs font-semibold text-gray-900">{title}</p>
        <p className="text-[10px] text-gray-500">{size}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Trust strip
// ─────────────────────────────────────────────────────────────

function TrustStrip({ lang }: { lang: AppLanguage }) {
  // TODO: swap for real ministries as they onboard.
  const churches = [
    'Fire Church · Cameroon',
    'Grace Community · UK',
    'New Hope Chapel · USA',
    'Elim Ministries · Kenya',
    'Covenant Fellowship · Ghana',
    'Living Waters · Nigeria',
  ];
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          {t('landing.trust.label', lang)}
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium uppercase tracking-wide text-gray-400">
          {churches.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Streamline — 3 service cards with mockups inside
// ─────────────────────────────────────────────────────────────

function Streamline({ lang }: { lang: AppLanguage }) {
  return (
    <section className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            {t('landing.streamline.eyebrow', lang)}
          </p>
          <h2 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-gray-900 sm:text-5xl lg:text-6xl">
            {t('landing.streamline.title', lang)}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
            {t('landing.streamline.subtitle', lang)}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StreamlineCard
            titleKey="landing.streamline.card1.title"
            bodyKey="landing.streamline.card1.body"
            lang={lang}
          >
            <SundayChecklistMock lang={lang} />
          </StreamlineCard>
          <StreamlineCard
            titleKey="landing.streamline.card2.title"
            bodyKey="landing.streamline.card2.body"
            lang={lang}
          >
            <PastoralReportMock lang={lang} />
          </StreamlineCard>
          <StreamlineCard
            titleKey="landing.streamline.card3.title"
            bodyKey="landing.streamline.card3.body"
            lang={lang}
          >
            <MinistryInsightsMock lang={lang} />
          </StreamlineCard>
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            {t('landing.streamline.cta', lang)}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function StreamlineCard({
  titleKey,
  bodyKey,
  lang,
  children,
}: {
  titleKey: string;
  bodyKey: string;
  lang: AppLanguage;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      {/* Mockup lives inside the card in a soft gray container so the
          card feels like packaging around the product. */}
      <div className="rounded-2xl bg-gray-50 p-6">{children}</div>
      <div className="mt-5">
        <h3 className="text-xl font-bold text-gray-900">{t(titleKey, lang)}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
          {t(bodyKey, lang)}
        </p>
      </div>
    </div>
  );
}

// Small placeholder product mockups. All three follow the same visual
// language: rounded white surface, indigo-tinted accent, minimal
// numbers so a viewer parses the concept in under a second.
// TODO: swap each for real product screenshots when available.

function SundayChecklistMock({ lang }: { lang: AppLanguage }) {
  const rows = [
    { key: 'landing.streamline.mock1.beforeCount', tone: 'bg-indigo-600' },
    { key: 'landing.streamline.mock1.duringCount', tone: 'bg-indigo-400' },
    { key: 'landing.streamline.mock1.afterCount', tone: 'bg-indigo-300' },
  ];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold text-gray-900">
          {t('landing.streamline.mock1.title', lang)}
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-gray-700">
              <span className={`h-2 w-2 rounded-full ${r.tone}`} />
              {t(r.key, lang)}
            </span>
            <CheckCircle className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PastoralReportMock({ lang }: { lang: AppLanguage }) {
  const bars: Array<{ height: string; tone: string }> = [
    { height: '45%', tone: 'bg-indigo-300' },
    { height: '65%', tone: 'bg-indigo-500' },
    { height: '58%', tone: 'bg-indigo-400' },
    { height: '82%', tone: 'bg-indigo-600' },
  ];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {t('landing.streamline.mock2.title', lang)}
      </p>
      <div className="mt-1 flex items-baseline justify-between">
        <p className="text-lg font-bold text-gray-900">
          {t('landing.streamline.mock2.month', lang)}
        </p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          {t('landing.streamline.mock2.attendanceUp', lang)}
        </span>
      </div>
      <div className="mt-4 flex h-16 items-end gap-1.5">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t ${b.tone}`}
            style={{ height: b.height }}
          />
        ))}
      </div>
      <p className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
        <span>{t('landing.streamline.mock2.sundaysServed', lang)}</span>
        <span className="font-semibold text-gray-900">4</span>
      </p>
    </div>
  );
}

function MinistryInsightsMock({ lang }: { lang: AppLanguage }) {
  const rows = [
    {
      titleKey: 'landing.streamline.mock3.ushering',
      sizeKey: 'landing.streamline.mock3.usheringSize',
      tone: 'bg-indigo-600',
    },
    {
      titleKey: 'landing.streamline.mock3.welcome',
      sizeKey: 'landing.streamline.mock3.welcomeSize',
      tone: 'bg-purple-500',
    },
  ];
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold text-gray-900">
          {t('landing.streamline.mock3.title', lang)}
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.titleKey} className="flex items-center gap-3">
            <span className={`h-8 w-8 rounded-full ${r.tone}`} />
            <div>
              <p className="text-xs font-semibold text-gray-900">
                {t(r.titleKey, lang)}
              </p>
              <p className="text-[10px] text-gray-500">{t(r.sizeKey, lang)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Features — 9-card grid (indigo-tinted icons on gray-50 stage)
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
    <section id="features" className="bg-gray-50 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {t('landing.features.eyebrow', lang)}
          </p>
          <h2 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-gray-900 sm:text-5xl lg:text-6xl">
            {t('landing.features.title', lang)}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
            {t('landing.features.subtitle', lang)}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.titleKey}
                className="rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 flex flex-wrap items-center gap-2 text-xl font-bold text-gray-900">
                  {t(f.titleKey, lang)}
                  {f.comingSoon && (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                      {t('landing.features.comingSoon', lang)}
                    </span>
                  )}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-gray-600">
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
// Pricing — currency-detected card on indigo wash
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
    <section id="pricing" className="bg-indigo-50/40 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {t('landing.pricing.eyebrow', lang)}
          </p>
          <h2 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-gray-900 sm:text-5xl lg:text-6xl">
            {t('landing.pricing.title', lang)}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
            {t('landing.pricing.subtitle', lang)}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl rounded-3xl border-2 border-indigo-100 bg-white p-8 shadow-xl sm:p-12">
          <div className="text-center">
            <p className="text-7xl font-black tracking-tight text-gray-900 sm:text-8xl">
              {priceDisplay}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              {currency} · {t('landing.pricing.perMonth', lang)}
            </p>
            {equivalents.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
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
              <li key={k} className="flex items-start gap-3 text-sm text-gray-700">
                <CheckCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600"
                  aria-hidden="true"
                />
                <span>{t(k, lang)}</span>
              </li>
            ))}
          </ul>

          <div className="my-8 h-px bg-gray-200" />

          <Link
            href="/signup"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
          >
            {t('landing.pricing.cta', lang)}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-4 text-center text-xs text-gray-500">
            {t('landing.pricing.ctaFine', lang)}
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-gray-500">
          {t('landing.pricing.footnote', lang)}
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Testimonial — two column, quote card on the right
// ─────────────────────────────────────────────────────────────

function Testimonial({ lang }: { lang: AppLanguage }) {
  const points = [
    { titleKey: 'landing.why.p1.title', bodyKey: 'landing.why.p1.body' },
    { titleKey: 'landing.why.p2.title', bodyKey: 'landing.why.p2.body' },
    { titleKey: 'landing.why.p3.title', bodyKey: 'landing.why.p3.body' },
  ];
  return (
    <section id="why" className="bg-white py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              {t('landing.why.eyebrow', lang)}
            </p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-gray-900 sm:text-5xl">
              {t('landing.why.title', lang)}
            </h2>
            <div className="mt-8 space-y-6">
              {points.map((p) => (
                <div key={p.titleKey}>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t(p.titleKey, lang)}
                  </h3>
                  <p className="mt-1.5 text-base leading-relaxed text-gray-600">
                    {t(p.bodyKey, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <figure className="rounded-3xl border border-gray-200 bg-white p-10 shadow-lg shadow-indigo-900/5">
            <Quote
              className="h-14 w-14 text-indigo-600"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <blockquote className="mt-4 text-xl font-medium italic leading-relaxed text-gray-800 sm:text-2xl">
              {t('landing.why.quote', lang)}
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4 border-t border-gray-200 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                DE
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">
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
// FAQ — native <details> accordion on gray-50 stage
// ─────────────────────────────────────────────────────────────

function FAQ({ lang }: { lang: AppLanguage }) {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <section id="faq" className="bg-gray-50 py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            {t('landing.faq.eyebrow', lang)}
          </p>
          <h2 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] text-gray-900 sm:text-5xl">
            {t('landing.faq.title', lang)}
          </h2>
        </div>

        <div className="mt-12 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
          {items.map((n) => (
            <details key={n} className="group px-6 py-5 open:pb-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-lg font-semibold text-gray-900">
                  {t(`landing.faq.q${n}`, lang)}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-indigo-600 transition group-open:rotate-45"
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
// Final CTA — deep indigo
// ─────────────────────────────────────────────────────────────

function FinalCta({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-indigo-900 py-24 text-center text-white sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
      />
      {/* Warm accent blob top-left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-flame-500/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-4xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
          {t('landing.finalCta.title', lang)}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-indigo-200 sm:text-xl">
          {t('landing.finalCta.subtitle', lang)}
        </p>
        <Link
          href="/signup"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-white px-10 py-5 text-lg font-semibold text-indigo-900 shadow-xl transition hover:bg-indigo-50"
        >
          {t('landing.finalCta.button', lang)}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="mt-5 text-sm text-indigo-300">
          {t('landing.finalCta.fine', lang)}
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer
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
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold text-white">LeaderSmart</span>
            </div>
            <p className="mt-3 text-base italic text-gray-300">
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 text-gray-300 transition hover:border-indigo-500 hover:text-white"
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

        <div className="mt-14 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          {t('landing.footer.bottom', lang)}
        </div>
      </div>
    </footer>
  );
}
