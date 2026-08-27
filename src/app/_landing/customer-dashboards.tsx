'use client';

import { useState } from 'react';
import Image from 'next/image';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Two example customer dashboards behind a toggle — a multi-country
// network (First Ladies International) and a single local church (Fire
// Church) — so a visitor sees the product shaped to their own scale.
//
// Each dashboard carries the CUSTOMER's accent colour (FLING pink, Fire
// orange), not the LeaderSmart palette. That is deliberate: these read
// as someone else's workspace inside a browser frame. The frame, the
// chrome, and the section around it stay on the yellow/navy system so
// the customer colour never leaks into LeaderSmart's own brand.
//
// The 900px breakpoint is an arbitrary variant rather than a
// tailwind.config screen, because a 200px sidebar stops being readable
// well before Tailwind's `md` and the config is shared with the app.

type View = 'network' | 'church';

const FLING = {
  accent: '#B91572',
  accentSoft: '#FCE7F3',
  url: 'app.leadersmart.com/firstladies',
};

const FIRE = {
  accent: '#F97316',
  accentSoft: '#FFEDD5',
  url: 'app.leadersmart.com/firechurch',
};

export function CustomerDashboards({ lang }: { lang: AppLanguage }) {
  const [view, setView] = useState<View>('network');

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

        <div className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label={t('landing.dash.title', lang)}
            className="inline-flex rounded-full border border-[#1A1E3F]/10 bg-white p-1"
          >
            <ToggleButton
              active={view === 'network'}
              onClick={() => setView('network')}
              id="dash-tab-network"
              controls="dash-panel-network"
            >
              <span aria-hidden="true">🌍</span>{' '}
              {t('landing.dash.toggle.network', lang)}
            </ToggleButton>
            <ToggleButton
              active={view === 'church'}
              onClick={() => setView('church')}
              id="dash-tab-church"
              controls="dash-panel-church"
            >
              <span aria-hidden="true">⛪</span>{' '}
              {t('landing.dash.toggle.church', lang)}
            </ToggleButton>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl border border-[#1A1E3F]/10 bg-white shadow-2xl shadow-[#1A1E3F]/10">
          <BrowserChrome url={view === 'network' ? FLING.url : FIRE.url} />

          {/* Both panels occupy the same grid cell so the cross-fade has
              something to fade to and the card height doesn't jump when
              the toggle flips. */}
          <div className="grid">
            <Panel
              active={view === 'network'}
              id="dash-panel-network"
              labelledBy="dash-tab-network"
            >
              <FlingDashboard lang={lang} />
            </Panel>
            <Panel
              active={view === 'church'}
              id="dash-panel-church"
              labelledBy="dash-tab-church"
            >
              <FireDashboard lang={lang} />
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleButton({
  active,
  onClick,
  id,
  controls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  id: string;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={
        'whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ' +
        (active
          ? 'bg-[#1A1E3F] text-[#EFCB4A]'
          : 'text-[#3D4470] hover:bg-[#F9F4E7] hover:text-[#1A1E3F]')
      }
    >
      {children}
    </button>
  );
}

function Panel({
  active,
  id,
  labelledBy,
  children,
}: {
  active: boolean;
  id: string;
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={labelledBy}
      // Not the `hidden` attribute: the inactive panel has to keep
      // occupying its grid cell for the cross-fade to have something to
      // fade against, and `hidden` would need an inline display override
      // to do that — leaving it ambiguous whether AT still reads it.
      // Nothing inside either panel is focusable, so aria-hidden plus
      // pointer-events is enough to take it out of play.
      aria-hidden={!active}
      className={
        'col-start-1 row-start-1 transition-opacity duration-300 ' +
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
