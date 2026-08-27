import Link from 'next/link';
import { CheckSquare, Play, Sprout, Users } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { Highlight } from './highlight';

// Hero — cream base with a yellow wash bleeding in from the top-left and
// a sage wash from the bottom-right, so the fold has warmth without a
// hard gradient band. Both washes are decorative layers rather than a
// `bg-gradient-*` utility because two independently-positioned radials
// can't be expressed in one Tailwind gradient class.

export function Hero({ lang }: { lang: AppLanguage }) {
  return (
    <section className="relative overflow-hidden bg-[#FDFCF7] pb-16 pt-28 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-[#FBF3D0] opacity-70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-56 -right-40 h-[38rem] w-[38rem] rounded-full bg-[#D8E5D0] opacity-60 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10">
        {/* Text column — 7 of 12 (~60%). */}
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#EFCB4A]/40 bg-white/70 px-4 py-2 text-sm font-semibold text-[#1A1E3F]">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#EFCB4A]"
            />
            {t('landing.hero.pill', lang)}
          </span>

          <h1
            className="font-manrope mt-6 font-black leading-[1.04] tracking-[-0.03em] text-[#1A1E3F]"
            style={{ fontSize: 'clamp(44px, 7vw, 88px)' }}
          >
            {t('landing.hero.title.pre1', lang)}{' '}
            <Highlight tone="yellow">
              {t('landing.hero.title.mission', lang)}
            </Highlight>
            .
            <br />
            {t('landing.hero.title.pre2', lang)}{' '}
            <Highlight tone="sage">
              {t('landing.hero.title.system', lang)}
            </Highlight>
            .
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-[#3D4470] sm:text-lg">
            {t('landing.hero.subtitle', lang)}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#EFCB4A] px-8 py-4 text-base font-bold text-[#1A1E3F] shadow-lg shadow-[#EFCB4A]/30 transition hover:bg-[#D9B531]"
            >
              {t('landing.hero.ctaPrimary', lang)}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#1A1E3F]/20 bg-white px-7 py-4 text-base font-bold text-[#1A1E3F] transition hover:border-[#1A1E3F]/40 hover:bg-[#F9F4E7]"
            >
              <Play
                className="h-3.5 w-3.5 fill-[#1A1E3F] text-[#1A1E3F]"
                aria-hidden="true"
              />
              {t('landing.hero.ctaSecondary', lang)}
            </Link>
          </div>

          <p className="mt-4 text-sm text-[#3D4470]/80">
            {t('landing.hero.ctaFine', lang)}
          </p>
        </div>

        {/* Mockup composition — 5 of 12 (~40%). */}
        <div className="lg:col-span-5">
          <HeroMockup lang={lang} />
        </div>
      </div>
    </section>
  );
}

// Browser-chrome mockup on a 2° tilt, ringed by three floating badges.
// Every metric here is a leadership metric — checklist progress, team
// health, volunteer confirmations, reports outstanding. No attendance,
// no congregation size: the product is accountability, not a head count.
// TODO: swap for a real Leadership Overview screenshot.
function HeroMockup({ lang }: { lang: AppLanguage }) {
  return (
    <div
      className="relative"
      role="img"
      aria-label={t('landing.hero.mockAlt', lang)}
    >
      <div className="rotate-2 overflow-hidden rounded-2xl border border-[#1A1E3F]/10 bg-white shadow-2xl shadow-[#1A1E3F]/15">
        {/* Browser chrome. */}
        <div className="flex items-center gap-1.5 border-b border-[#1A1E3F]/10 bg-[#F9F4E7] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EFCB4A]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#A8C79A]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#1A1E3F]/20" />
          <p className="font-manrope ml-3 text-xs font-extrabold tracking-tight text-[#1A1E3F]">
            {t('landing.hero.mock.title', lang)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-5">
          <StatCard
            label={t('landing.hero.mock.checklist', lang)}
            value="12/17"
            badge={t('landing.hero.mock.checklistBadge', lang)}
            badgeTone="sage"
          />
          <StatCard
            label={t('landing.hero.mock.teamHealth', lang)}
            value="92%"
            chart
          />
          <StatCard
            label={t('landing.hero.mock.volunteers', lang)}
            value="18/22"
            badge={t('landing.hero.mock.volunteersBadge', lang)}
            badgeTone="sage"
          />
          <StatCard
            label={t('landing.hero.mock.reports', lang)}
            value="3"
            badge={t('landing.hero.mock.reportsBadge', lang)}
            badgeTone="yellow"
          />
        </div>
      </div>

      {/* Floating badges. Hidden below `sm` — at 375px they overlap the
          mockup body and turn the composition to mush. */}
      <div className="absolute -left-3 -top-5 hidden -rotate-2 sm:block">
        <FloatBadge tone="yellow" icon={CheckSquare}>
          {t('landing.hero.badge.checklist', lang)}
        </FloatBadge>
      </div>
      <div className="absolute -right-4 -top-7 hidden rotate-3 sm:block">
        <FloatBadge tone="navy" icon={Users}>
          {t('landing.hero.badge.pastors', lang)}
        </FloatBadge>
      </div>
      <div className="absolute -bottom-6 -left-5 hidden rotate-1 sm:block">
        <FloatBadge tone="sage" icon={Sprout}>
          {t('landing.hero.badge.growing', lang)}
        </FloatBadge>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  badge,
  badgeTone = 'sage',
  chart = false,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeTone?: 'sage' | 'yellow';
  chart?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#1A1E3F]/10 bg-[#FDFCF7] p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#3D4470]">
        {label}
      </p>
      <p className="font-manrope mt-1.5 text-2xl font-black tracking-tight text-[#1A1E3F]">
        {value}
      </p>
      {chart ? (
        // Team-health mix bar: yellow / navy / sage in one track.
        <div className="mt-3 flex h-2 overflow-hidden rounded-full" aria-hidden="true">
          <span className="w-1/2 bg-[#EFCB4A]" />
          <span className="w-1/4 bg-[#1A1E3F]" />
          <span className="w-1/4 bg-[#A8C79A]" />
        </div>
      ) : (
        badge && (
          <span
            className={
              'mt-2.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#1A1E3F] ' +
              (badgeTone === 'yellow' ? 'bg-[#FBF3D0]' : 'bg-[#D8E5D0]')
            }
          >
            {badge}
          </span>
        )
      )}
    </div>
  );
}

function FloatBadge({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'yellow' | 'navy' | 'sage';
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: React.ReactNode;
}) {
  const tile =
    tone === 'yellow'
      ? 'bg-[#EFCB4A] text-[#1A1E3F]'
      : tone === 'navy'
        ? 'bg-[#1A1E3F] text-[#EFCB4A]'
        : 'bg-[#A8C79A] text-[#1A1E3F]';

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#1A1E3F]/10 bg-white px-3 py-2 shadow-xl shadow-[#1A1E3F]/10">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden={true} />
      </span>
      <p className="whitespace-nowrap text-xs font-bold text-[#1A1E3F]">
        {children}
      </p>
    </div>
  );
}
