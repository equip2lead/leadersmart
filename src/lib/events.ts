import { t } from './i18n';
import type { AppLanguage, Event, EventStatus } from './types';

// Shared between the events pages, the server actions and the two dashboard
// panels, so none of them can disagree about what a limit is or how a date
// reads. The limits live here rather than in actions.ts because a 'use server'
// file may export nothing but async functions.

export const MAX_EVENT_TITLE = 200;
export const MAX_EVENT_DESCRIPTION = 1000;
export const MAX_EVENT_NOTES = 2000;

/** Today as 'YYYY-MM-DD', for comparing against a DATE column.
    Built from local parts rather than toISOString(), which converts to UTC
    first and so reports tomorrow's date all evening east of Greenwich. */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Format a DATE column for display.
    The 'T00:00:00' suffix keeps it in local time: `new Date('2026-09-09')` is
    parsed as UTC midnight and renders as the 8th anywhere west of Greenwich. */
export function formatEventDate(
  isoDate: string,
  lang: AppLanguage,
  opts: { weekday?: boolean } = {},
): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-US',
    {
      ...(opts.weekday ? { weekday: 'short' as const } : {}),
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  );
}

/** 'HH:MM:SS' → 'HH:MM'. The seconds Postgres returns are never meaningful
    here and only add noise. */
export function formatEventTime(time: string | null): string | null {
  if (!time) return null;
  return time.slice(0, 5);
}

/** The time range as one string, or null when no start time was given.
    An end time without a start is not renderable as a range, so it degrades
    to just the start rather than printing a dangling dash. */
export function formatEventTimeRange(
  start: string | null,
  end: string | null,
): string | null {
  const s = formatEventTime(start);
  if (!s) return null;
  const e = formatEventTime(end);
  return e ? `${s} – ${e}` : s;
}

export const EVENT_STATUS_CLASS: Record<EventStatus, string> = {
  draft: 'border-gray-200 bg-white text-muted',
  published: 'border-indigo-royal-200 bg-indigo-royal-50 text-indigo-royal-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
};

// Type badges are tinted so a list scans by shape as well as by text. Types
// with no entry fall back to the neutral tone rather than going unstyled,
// which is what keeps an unrecognised key from looking broken.
const TYPE_TONE: Record<string, string> = {
  sunday_service: 'bg-indigo-royal-50 text-indigo-royal-700',
  prayer_meeting: 'bg-violet-50 text-violet-700',
  outreach: 'bg-emerald-50 text-emerald-700',
  baptism: 'bg-sky-50 text-sky-700',
  wedding: 'bg-pink-50 text-pink-700',
  conference: 'bg-indigo-royal-50 text-indigo-royal-700',
  retreat: 'bg-teal-50 text-teal-700',
  training: 'bg-amber-50 text-amber-700',
  campaign: 'bg-orange-50 text-orange-700',
  workshop: 'bg-cyan-50 text-cyan-700',
};

export function eventTypeTone(eventType: string): string {
  return TYPE_TONE[eventType] ?? 'bg-gray-100 text-body';
}

export function eventStatusLabel(status: EventStatus, lang: AppLanguage): string {
  return t(`events.status.${status}`, lang);
}

export type EventTab = 'upcoming' | 'past' | 'drafts' | 'all';
export const EVENT_TABS: EventTab[] = ['upcoming', 'past', 'drafts', 'all'];

/**
 * Which events belong under a tab.
 *
 * Filtering happens here rather than in SQL because "past" is two conditions
 * joined by OR across different columns — a date in the past, or a status of
 * completed — and PostgREST cannot express that without an rpc. The lists are
 * per-church and small; when they stop being small this becomes a view.
 *
 * Drafts are excluded from every tab but their own: a draft is an admin's
 * working copy, and the tab that shows them is admin-only.
 */
export function filterEventsForTab(
  events: Event[],
  tab: EventTab,
  today: string,
): Event[] {
  switch (tab) {
    case 'upcoming':
      return events.filter(
        (e) => e.status === 'published' && e.event_date >= today,
      );
    case 'past':
      return events.filter(
        (e) =>
          e.status !== 'draft' &&
          (e.status === 'completed' || e.status === 'cancelled' || e.event_date < today),
      );
    case 'drafts':
      return events.filter((e) => e.status === 'draft');
    case 'all':
      return events;
  }
}
