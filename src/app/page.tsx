import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  ArrowRight,
  Baby,
  Calendar,
  Check,
  ClipboardCheck,
  Flame,
  MessageSquare,
  TrendingUp,
  Users,
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

// The marketing homepage lives at src/app/page.tsx. It is a server
// component that reads the visitor's preferred_lang and
// preferred_currency cookies (set by middleware on first visit) and
// renders every section pre-translated + pre-priced. Interactive bits
// (lang toggle, currency dropdown, mobile menu) are extracted into
// client components under src/app/_landing/.

// TODO: swap the placeholder <div> blocks for real photographs from
// Unsplash. Chosen queries (globally diverse — see spec §"Photo
// sources"): "church congregation" (hero + problem section) and
// "church worship" (why section testimonial backdrop). Attribute the
// photographer once the specific images are chosen.

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
        <SocialProof lang={lang} />
        <Problem lang={lang} />
        <Features lang={lang} />
        <HowItWorks lang={lang} />
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
      <LandingFooter lang={lang} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Section: hero
// ─────────────────────────────────────────────────────────────

function Hero({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-brand-700 text-white">
      {/* Subtle grain via layered radial gradients — no external asset. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
      />
      <div className="relative mx-auto grid min-h-[85vh] max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-flame-600 bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-flame-100">
            <Flame className="h-3.5 w-3.5 text-flame-600" aria-hidden="true" />
            {t('landing.hero.pill', lang)}
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            {t('landing.hero.title', lang)}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
            {t('landing.hero.subtitle', lang)}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-flame-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-flame-700"
            >
              {t('landing.hero.ctaPrimary', lang)}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-transparent px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
            >
              {t('landing.hero.ctaSecondary', lang)}
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            {t('landing.hero.ctaFine', lang)}
          </p>
        </div>

        {/* Product mockup placeholder. TODO: replace with actual admin
            dashboard screenshot (dark-mode variant for the navy hero). */}
        <div className="relative">
          <div
            className="aspect-video overflow-hidden rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl"
            role="img"
            aria-label={t('landing.hero.mockAlt', lang)}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-1.5 border-b border-gray-700 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <div className="flex flex-1 items-center justify-center p-6 text-xs text-gray-500">
                {/* Placeholder chrome — real screenshot goes here. */}
                Admin dashboard preview
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Section: social proof
// ─────────────────────────────────────────────────────────────

function SocialProof({ lang }: { lang: AppLanguage }) {
  // TODO: replace with real church names as they onboard.
  const churches = [
    'Fire Church · Cameroon',
    'Grace Community · UK',
    'New Hope Chapel · USA',
    'Elim Ministries · Kenya',
    'Covenant Fellowship · Ghana',
    'Living Waters · Nigeria',
  ];
  return (
    <section className="border-b border-gray-100 bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
          {t('landing.social.title', lang)}
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
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
// Section: problem
// ─────────────────────────────────────────────────────────────

function Problem({ lang }: { lang: AppLanguage }) {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Image column. TODO: swap for a globally-diverse
              "church congregation worship" Unsplash photograph. */}
          <div
            className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 via-gray-100 to-flame-50"
            role="img"
            aria-label={t('landing.problem.imageAlt', lang)}
          />
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {t('landing.problem.title', lang)}
            </h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-body">
              <p>{t('landing.problem.p1', lang)}</p>
              <p>{t('landing.problem.p2', lang)}</p>
              <p className="font-semibold text-ink">
                {t('landing.problem.p3', lang)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Section: features
// ─────────────────────────────────────────────────────────────

type FeatureDef = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  comingSoon?: boolean;
};

const FEATURES: FeatureDef[] = [
  {
    icon: Calendar,
    titleKey: 'landing.feature.pastor.title',
    descKey: 'landing.feature.pastor.desc',
  },
  {
    icon: ClipboardCheck,
    titleKey: 'landing.feature.eval.title',
    descKey: 'landing.feature.eval.desc',
  },
  {
    icon: Users,
    titleKey: 'landing.feature.dept.title',
    descKey: 'landing.feature.dept.desc',
  },
  {
    icon: TrendingUp,
    titleKey: 'landing.feature.rotation.title',
    descKey: 'landing.feature.rotation.desc',
    comingSoon: true,
  },
  {
    icon: Baby,
    titleKey: 'landing.feature.kids.title',
    descKey: 'landing.feature.kids.desc',
  },
  {
    icon: MessageSquare,
    titleKey: 'landing.feature.whatsapp.title',
    descKey: 'landing.feature.whatsapp.desc',
  },
];

function Features({ lang }: { lang: AppLanguage }) {
  return (
    <section id="features" className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t('landing.features.title', lang)}
          </h2>
          <p className="mt-4 text-base text-body sm:text-lg">
            {t('landing.features.subtitle', lang)}
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.titleKey}
                className="rounded-xl border border-gray-100 bg-white p-6 shadow-card"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-flame-50 text-flame-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 flex items-center gap-2 text-lg font-semibold text-ink">
                  {t(f.titleKey, lang)}
                  {f.comingSoon && (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {t('landing.features.comingSoon', lang)}
                    </span>
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-body">
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
// Section: how it works
// ─────────────────────────────────────────────────────────────

function HowItWorks({ lang }: { lang: AppLanguage }) {
  const steps = [
    { titleKey: 'landing.how.step1.title', descKey: 'landing.how.step1.desc' },
    { titleKey: 'landing.how.step2.title', descKey: 'landing.how.step2.desc' },
    { titleKey: 'landing.how.step3.title', descKey: 'landing.how.step3.desc' },
  ];
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t('landing.how.title', lang)}
          </h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.titleKey}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-flame-600 text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">
                {t(s.titleKey, lang)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-body">
                {t(s.descKey, lang)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Section: pricing
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
    <section id="pricing" className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {t('landing.pricing.title', lang)}
          </h2>
          <p className="mt-4 text-base text-body sm:text-lg">
            {t('landing.pricing.subtitle', lang)}
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-xl sm:p-12">
          <div className="text-center">
            <p className="text-6xl font-bold tracking-tight text-brand-700 sm:text-7xl">
              {priceDisplay}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              {currency} {t('landing.pricing.perMonth', lang)}
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
                <Check
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-flame-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-flame-700"
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
// Section: why LeaderSmart
// ─────────────────────────────────────────────────────────────

function Why({ lang }: { lang: AppLanguage }) {
  const points = [
    { titleKey: 'landing.why.p1.title', bodyKey: 'landing.why.p1.body' },
    { titleKey: 'landing.why.p2.title', bodyKey: 'landing.why.p2.body' },
    { titleKey: 'landing.why.p3.title', bodyKey: 'landing.why.p3.body' },
  ];
  return (
    <section id="why" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {t('landing.why.title', lang)}
            </h2>
            <div className="mt-8 space-y-6">
              {points.map((p) => (
                <div key={p.titleKey}>
                  <h3 className="text-base font-semibold text-ink">
                    {t(p.titleKey, lang)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-body">
                    {t(p.bodyKey, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <figure className="rounded-2xl bg-gray-50 p-8 sm:p-10">
            <span
              aria-hidden="true"
              className="block text-6xl font-serif leading-none text-flame-600"
            >
              &ldquo;
            </span>
            <blockquote className="mt-2 text-lg leading-relaxed text-ink sm:text-xl">
              {t('landing.why.quote', lang)}
            </blockquote>
            <figcaption className="mt-6 border-t border-gray-200 pt-4 text-sm">
              <p className="font-semibold text-ink">
                {t('landing.why.attribution', lang)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t('landing.why.since', lang)}
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Section: FAQ (native <details> — no JS needed)
// ─────────────────────────────────────────────────────────────

function FAQ({ lang }: { lang: AppLanguage }) {
  const qs = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <section className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t('landing.faq.title', lang)}
        </h2>
        <div className="mt-10 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
          {qs.map((n) => (
            <details key={n} className="group px-6 py-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-ink">
                {t(`landing.faq.q${n}`, lang)}
                <span
                  aria-hidden="true"
                  className="ml-4 text-2xl leading-none text-muted transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-body">
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
// Section: final CTA
// ─────────────────────────────────────────────────────────────

function FinalCta({ lang }: { lang: AppLanguage }) {
  return (
    <section className="bg-brand-700 py-20 text-center text-white sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {t('landing.finalCta.title', lang)}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-gray-300 sm:text-lg">
          {t('landing.finalCta.subtitle', lang)}
        </p>
        <Link
          href="/signup"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-lg bg-flame-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-flame-700"
        >
          {t('landing.finalCta.button', lang)}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-4 text-xs text-gray-400">
          {t('landing.finalCta.fine', lang)}
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────

function LandingFooter({ lang }: { lang: AppLanguage }) {
  const links: Array<{
    titleKey: string;
    items: Array<{ href: string; labelKey: string }>;
  }> = [
    {
      titleKey: 'landing.footer.product',
      items: [
        { href: '#features', labelKey: 'landing.footer.features' },
        { href: '#pricing', labelKey: 'landing.footer.pricing' },
        { href: '/login', labelKey: 'landing.footer.signIn' },
        { href: '/signup', labelKey: 'landing.footer.startTrial' },
      ],
    },
    {
      titleKey: 'landing.footer.company',
      items: [
        { href: '#coming-soon', labelKey: 'landing.footer.about' },
        { href: '#coming-soon', labelKey: 'landing.footer.contact' },
        { href: '#coming-soon', labelKey: 'landing.footer.support' },
      ],
    },
    {
      titleKey: 'landing.footer.legal',
      items: [
        { href: '#coming-soon', labelKey: 'landing.footer.privacy' },
        { href: '#coming-soon', labelKey: 'landing.footer.terms' },
        { href: '#coming-soon', labelKey: 'landing.footer.dpa' },
      ],
    },
  ];
  return (
    <footer className="bg-brand-800 text-gray-300">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-flame-500" aria-hidden="true" />
              <span className="text-lg font-bold text-white">LeaderSmart</span>
            </div>
            <p className="mt-3 text-sm italic text-gray-400">
              {t('landing.tagline', lang)}
            </p>
            <p className="mt-6 text-xs text-gray-500">
              {t('landing.footer.copyright', lang)}
            </p>
          </div>
          {links.map((col) => (
            <div key={col.titleKey}>
              <p className="text-xs font-semibold uppercase tracking-wider text-white">
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
        <div className="mt-12 border-t border-brand-700 pt-6 text-center text-xs text-gray-500">
          {t('landing.footer.bottomBar', lang)}
        </div>
      </div>
    </footer>
  );
}
