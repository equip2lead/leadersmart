'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Two example customer dashboards on an auto-rotating carousel — a
// multi-country network (First Ladies International) and a single local
// church (Fire Church) — so a visitor sees the product shaped to their
// own scale without having to click anything.
//
// Each dashboard carries the CUSTOMER's accent colour (FLING pink, Fire
// orange), not the Equip2Lead Coach palette. That is deliberate: these read
// as someone else's workspace inside a browser frame. The frame, the
// chrome, and the section around it stay on the yellow/navy system so
// the customer colour never leaks into Equip2Lead Coach's own brand.
//
// The 900px breakpoint is an arbitrary variant rather than a
// tailwind.config screen, because a 200px sidebar stops being readable
// well before Tailwind's `md` and the config is shared with the app.

const ROTATE_MS = 4000;
const MANUAL_PAUSE_MS = 15000;
const ANNOUNCE_MS = 500;

const FLING = {
  accent: '#B91572',
  accentSoft: '#FCE7F3',
  url: 'app.equip2lead.coach/firstladies',
};

const FIRE = {
  accent: '#F97316',
  accentSoft: '#FFEDD5',
  url: 'app.equip2lead.coach/firechurch',
};

const SLIDES = [
  {
    id: 'network',
    url: FLING.url,
    emoji: '\u{1F30D}',
    labelKey: 'landing.dash.toggle.network',
    dotKey: 'landing.dash.dot.network',
    announceKey: 'landing.dash.announce.network',
  },
  {
    id: 'church',
    url: FIRE.url,
    emoji: '\u{26EA}',
    labelKey: 'landing.dash.toggle.church',
    dotKey: 'landing.dash.dot.church',
    announceKey: 'landing.dash.announce.church',
  },
] as const;

export function CustomerDashboards({ lang }: { lang: AppLanguage }) {
  const [index, setIndex] = useState(0);

  // Three independent reasons autoplay can stop. Kept as separate flags
  // rather than one `isPaused` boolean so they can't clobber each other
  // — e.g. the pointer leaving while the tab is still hidden must not
  // restart rotation.
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [manualHold, setManualHold] = useState(false);

  // Starts false so the server render and the first client render agree;
  // the effect below is the only thing that ever turns rotation on. That
  // also makes reduced-motion the safe default if matchMedia is missing.
  const [motionOk, setMotionOk] = useState(false);

  // Announcements go to a visually-hidden region holding just the slide
  // name, never to the dashboard card itself — a live region wrapping the
  // whole card would read every stat and chip aloud. Auto-rotation leaves
  // this empty, so it only ever speaks for a deliberate click.
  const [announcement, setAnnouncement] = useState('');

  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotionOk(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const autoplay = motionOk && !hovered && !tabHidden && !manualHold;

  useEffect(() => {
    if (!autoplay) return;
    // The interval id is a local const rather than a ref: the effect's
    // own cleanup covers both a dependency change and unmount, and a ref
    // would only add a way for the two to disagree.
    const id = setInterval(
      () => setIndex((prev) => (prev + 1) % SLIDES.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [autoplay]);

  useEffect(
    () => () => {
      if (manualTimer.current) clearTimeout(manualTimer.current);
      if (announceTimer.current) clearTimeout(announceTimer.current);
    },
    [],
  );

  // Clicking a dot holds rotation for 15s so there is time to read the
  // slide that was asked for.
  const jumpTo = useCallback(
    (next: number) => {
      setIndex(next);
      setManualHold(true);
      setAnnouncement(t(SLIDES[next].announceKey, lang));

      if (manualTimer.current) clearTimeout(manualTimer.current);
      manualTimer.current = setTimeout(
        () => setManualHold(false),
        MANUAL_PAUSE_MS,
      );

      // Clearing the text matters: clicking the control for the slide
      // already shown would otherwise re-render identical content, which
      // is not a change and so would not be announced a second time.
      if (announceTimer.current) clearTimeout(announceTimer.current);
      announceTimer.current = setTimeout(() => setAnnouncement(''), ANNOUNCE_MS);
    },
    [lang],
  );

  return (
    <section className="bg-[#FDFCF7] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
            {t('landing.dash.eyebrow', lang)}
          </p>
          <h2 className="font-manrope mt-3 text-4xl font-black leading-[1.1] tracking-[-0.02em] text-[#1A1E3F] sm:text-5xl">
            {t('landing.dash.title', lang)}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-[#3D4470] sm:text-lg">
            {t('landing.dash.subtitle', lang)}
          </p>
        </div>

        {/* Hover and focus both pause: a keyboard user tabbing onto a dot
            is reading just as much as a mouse user hovering. */}
        <div
          className="mx-auto mt-12 max-w-5xl"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setHovered(true)}
          onBlurCapture={() => setHovered(false)}
        >
          <div className="mx-auto mb-6 max-w-fit rounded-full border border-[#1A1E3F]/10 bg-white p-1.5 shadow-sm">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => jumpTo(i)}
                aria-current={index === i}
                className={
                  'font-manrope rounded-full px-6 py-2.5 text-sm font-bold transition-colors duration-200 ' +
                  (index === i
                    ? 'bg-[#1A1E3F] text-[#EFCB4A]'
                    : 'text-gray-500 hover:bg-[#F9F4E7]')
                }
              >
                <span aria-hidden="true">{slide.emoji}</span>{' '}
                {t(slide.labelKey, lang)}
              </button>
            ))}
          </div>

          {/* Present from first render and always live, so the polite
              announcement is never made in the same DOM mutation that
              introduces the attribute. */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>

          <div
            role="region"
            aria-live="off"
            aria-label={t('landing.dash.title', lang)}
            className="overflow-hidden rounded-2xl border border-[#1A1E3F]/10 bg-white shadow-2xl shadow-[#1A1E3F]/10"
          >
            <BrowserChrome url={SLIDES[index].url} />

            {/* Both panels occupy the same grid cell so the crossfade has
                something to fade to and the card height doesn't jump. */}
            <div className="grid">
              <Panel active={index === 0} id="dash-panel-network">
                <FlingDashboard lang={lang} />
              </Panel>
              <Panel active={index === 1} id="dash-panel-church">
                <FireDashboard lang={lang} />
              </Panel>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={t(slide.dotKey, lang)}
                aria-current={index === i}
                // The visual dot is 8px tall, well under a usable tap
                // target, so the padding on the button carries the hit
                // area and the inner span carries the spec'd size.
                className="flex items-center justify-center px-1 py-2"
              >
                <span
                  className={
                    'block h-2 rounded-full transition-all duration-200 ' +
                    (index === i
                      ? 'w-8 bg-[#1A1E3F]'
                      : 'w-2 bg-gray-300 hover:bg-[#1A1E3F]/40')
                  }
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({
  active,
  id,
  children,
}: {
  active: boolean;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      // Not the `hidden` attribute: the inactive panel has to keep
      // occupying its grid cell for the crossfade to have something to
      // fade against, and `hidden` would need an inline display override
      // to do that — leaving it ambiguous whether AT still reads it.
      // Nothing inside either panel is focusable, so aria-hidden plus
      // pointer-events is enough to take it out of play.
      aria-hidden={!active}
      className={
        'col-start-1 row-start-1 transition-opacity duration-[400ms] ' +
        (active ? 'opacity-100' : 'pointer-events-none opacity-0')
      }
    >
      {children}
    </div>
  );
}

function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-[#1A1E3F]/10 bg-[#F9F4E7] px-4 py-3">
      <span className="h-2.5 w-2.5 rounded-full bg-[#EFCB4A]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#A8C79A]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#1A1E3F]/20" />
      <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-[11px] text-[#3D4470]">
        {url}
      </span>
    </div>
  );
}

// ── Shared dashboard furniture ───────────────────────────────────────

function DashShell({
  logo,
  name,
  tag,
  nav,
  accent,
  children,
}: {
  logo: React.ReactNode;
  name: string;
  tag: string;
  nav: string[];
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[200px_1fr] max-[900px]:grid-cols-1">
      <aside className="border-r border-[#1A1E3F]/10 bg-[#FDFCF7] p-4 max-[900px]:hidden">
        <div className="flex items-center gap-2.5">
          {logo}
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#1A1E3F]">{name}</p>
            <p className="truncate text-[10px] text-[#3D4470]">{tag}</p>
          </div>
        </div>
        <ul className="mt-5 space-y-1">
          {nav.map((label, i) => (
            <li key={label}>
              <span
                className={
                  'block rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ' +
                  (i === 0 ? 'text-white' : 'text-[#3D4470]')
                }
                style={i === 0 ? { backgroundColor: accent } : undefined}
              >
                {label}
              </span>
            </li>
          ))}
        </ul>
      </aside>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wide text-[#3D4470]">
      {children}
    </p>
  );
}

// ── First Ladies International — network view ────────────────────────

const COUNTRIES = [
  'landing.dash.country.cm',
  'landing.dash.country.ng',
  'landing.dash.country.gh',
  'landing.dash.country.ke',
  'landing.dash.country.za',
  'landing.dash.country.uk',
  'landing.dash.country.us',
  'landing.dash.country.fr',
];

const ZONES = ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Buea', 'Garoua'];

// Initials + zone rather than invented full names — this is mock data
// standing in for a real roster, and it shouldn't read as real people.
const LEADERS = [
  { initials: 'MN', zone: 'Douala' },
  { initials: 'AK', zone: 'Yaoundé' },
  { initials: 'BT', zone: 'Bamenda' },
  { initials: 'CE', zone: 'Buea' },
];

function FlingDashboard({ lang }: { lang: AppLanguage }) {
  const activities = [
    { title: 'landing.dash.fling.act1', meta: 'landing.dash.fling.act1meta' },
    { title: 'landing.dash.fling.act2', meta: 'landing.dash.fling.act2meta' },
    { title: 'landing.dash.fling.act3', meta: 'landing.dash.fling.act3meta' },
  ];

  return (
    <DashShell
      accent={FLING.accent}
      name={t('landing.dash.fling.name', lang)}
      tag={t('landing.dash.fling.tag', lang)}
      nav={[
        t('landing.dash.fling.nav.overview', lang),
        t('landing.dash.fling.nav.countries', lang),
        t('landing.dash.fling.nav.zones', lang),
        t('landing.dash.fling.nav.leaders', lang),
        t('landing.dash.fling.nav.reports', lang),
      ]}
      logo={
        <Image
          src="/logos/first-ladies.jpeg"
          alt={t('landing.dash.fling.name', lang)}
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg object-cover"
        />
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Stat value="20" label={t('landing.dash.fling.statCountries', lang)} accent={FLING.accent} />
        <Stat value="46" label={t('landing.dash.fling.statZones', lang)} accent={FLING.accent} />
        <Stat value="312" label={t('landing.dash.fling.statLeaders', lang)} accent={FLING.accent} />
      </div>

      <div className="mt-5">
        <CardTitle>{t('landing.dash.fling.countriesTitle', lang)}</CardTitle>
        <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {COUNTRIES.map((k) => (
            <span
              key={k}
              className="truncate rounded-lg border border-[#1A1E3F]/10 bg-white px-2 py-1.5 text-center text-[10px] font-semibold text-[#1A1E3F]"
            >
              {t(k, lang)}
            </span>
          ))}
          <span
            className="rounded-lg px-2 py-1.5 text-center text-[10px] font-bold"
            style={{ backgroundColor: FLING.accentSoft, color: FLING.accent }}
          >
            {t('landing.dash.fling.more', lang)}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <CardTitle>{t('landing.dash.fling.zonesTitle', lang)}</CardTitle>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {ZONES.map((z) => (
            <span
              key={z}
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ backgroundColor: FLING.accentSoft, color: FLING.accent }}
            >
              {z}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <CardTitle>{t('landing.dash.fling.activitiesTitle', lang)}</CardTitle>
          <ul className="mt-2.5 space-y-2">
            {activities.map((a) => (
              <li
                key={a.title}
                className="flex items-start gap-2.5 rounded-lg border border-[#1A1E3F]/10 bg-white px-3 py-2"
              >
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: FLING.accent }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#1A1E3F]">
                    {t(a.title, lang)}
                  </p>
                  <p className="text-[10px] text-[#3D4470]">{t(a.meta, lang)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <CardTitle>{t('landing.dash.fling.leadersTitle', lang)}</CardTitle>
          <ul className="mt-2.5 space-y-2">
            {LEADERS.map((l) => (
              <li key={l.initials} className="flex items-center gap-2.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: FLING.accentSoft,
                    color: FLING.accent,
                  }}
                >
                  {l.initials}
                </span>
                <p className="text-[11px] text-[#3D4470]">{l.zone}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashShell>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-[#1A1E3F]/10 bg-[#FDFCF7] p-3">
      <p
        className="font-manrope text-2xl font-black tracking-tight"
        style={{ color: accent }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3D4470]">
        {label}
      </p>
    </div>
  );
}

// ── Fire Church — local church view ──────────────────────────────────

const SERVICES = [
  { key: 'landing.dash.fire.service1', start: '7:00 AM', arrive: '6:15 AM' },
  { key: 'landing.dash.fire.service2', start: '10:00 AM', arrive: '9:15 AM' },
  { key: 'landing.dash.fire.service3', start: '5:00 PM', arrive: '4:15 PM' },
];

const DEPARTMENTS = [
  'landing.dash.dept.ushering',
  'landing.dash.dept.welcome',
  'landing.dash.dept.media',
  'landing.dash.dept.cleaning',
  'landing.dash.dept.kids',
  'landing.dash.dept.worship',
];

function FireDashboard({ lang }: { lang: AppLanguage }) {
  return (
    <DashShell
      accent={FIRE.accent}
      name={t('landing.dash.fire.name', lang)}
      tag={t('landing.dash.fire.tag', lang)}
      nav={[
        t('landing.dash.fire.nav.overview', lang),
        t('landing.dash.fire.nav.sunday', lang),
        t('landing.dash.fire.nav.team', lang),
        t('landing.dash.fire.nav.departments', lang),
        t('landing.dash.fire.nav.reports', lang),
      ]}
      logo={
        // Navy plate behind the logo — the mark is orange on transparent,
        // so it needs a dark ground to read.
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1A1E3F] p-1">
          <Image
            src="/logos/fire-church.png"
            alt={t('landing.dash.fire.name', lang)}
            width={28}
            height={28}
            className="h-full w-full object-contain"
          />
        </span>
      }
    >
      {/* Countdown hero */}
      <div className="rounded-xl bg-[#1A1E3F] px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
          {t('landing.dash.fire.countdownLabel', lang)}
        </p>
        <p className="font-manrope mt-1 flex items-baseline gap-1.5 text-3xl font-black tracking-tight text-white">
          2
          <span className="text-sm font-bold text-white/60">
            {t('landing.dash.fire.days', lang)}
          </span>
          <span style={{ color: FIRE.accent }}>14</span>
          <span className="text-sm font-bold text-white/60">
            {t('landing.dash.fire.hours', lang)}
          </span>
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <CardTitle>{t('landing.dash.fire.servicesTitle', lang)}</CardTitle>
          <ul className="mt-2.5 space-y-2">
            {SERVICES.map((s) => (
              <li
                key={s.key}
                className="rounded-lg border border-[#1A1E3F]/10 bg-white px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-semibold text-[#1A1E3F]">
                    {t(s.key, lang)}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: FIRE.accentSoft,
                      color: '#9A3412',
                    }}
                  >
                    {s.start}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-[#3D4470]">
                  {t('landing.dash.fire.volunteersArrive', lang)} · {s.arrive}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[#1A1E3F]/10 bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>
                {t('landing.dash.fire.checklistTitle', lang)}
              </CardTitle>
              <span className="font-manrope text-xs font-black text-[#1A1E3F]">
                12/17
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1A1E3F]/10">
              <div
                className="h-full rounded-full"
                style={{ width: '70%', backgroundColor: FIRE.accent }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-[#3D4470]">
              {t('landing.dash.fire.checklistMeta', lang)}
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-[#1A1E3F]/10 bg-white px-3 py-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ backgroundColor: FIRE.accentSoft, color: '#9A3412' }}
            >
              PM
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-[#1A1E3F]">
                {t('landing.dash.fire.potmTitle', lang)}
              </p>
              <p className="truncate text-[10px] text-[#3D4470]">
                {t('landing.dash.fire.potmMeta', lang)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <CardTitle>{t('landing.dash.fire.deptTitle', lang)}</CardTitle>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {DEPARTMENTS.map((k) => (
            <span
              key={k}
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ backgroundColor: FIRE.accentSoft, color: '#9A3412' }}
            >
              {t(k, lang)}
            </span>
          ))}
        </div>
      </div>
    </DashShell>
  );
}
