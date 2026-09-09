import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { eventTypeLabel } from '@/lib/vocabulary';
import { eventTypeTone, formatEventDate, formatEventTimeRange, todayISO } from '@/lib/events';
import type { AppLanguage, Event } from '@/lib/types';

// The "Upcoming events" summary shared by both dashboards.
//
// One component, not two, so the church and the ministry cannot drift apart:
// this feature is universal, and nothing in it branches on organization_type.

const MAX_ROWS = 3;

/** The next few published events. Drafts are excluded — an unpublished event
    is not something the team can act on — and so is anything already past. */
export async function fetchUpcomingEvents(churchId: string): Promise<Event[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('church_id', churchId)
    .eq('status', 'published')
    .gte('event_date', todayISO())
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .limit(MAX_ROWS);
  return (data ?? []) as Event[];
}

export function UpcomingEventsViewAll({ lang }: { lang: AppLanguage }) {
  return (
    <Link
      href="/admin/events"
      className="text-xs font-semibold text-indigo-royal-700 hover:underline"
    >
      {t('dashboard.upcoming_events_view_all', lang)}
    </Link>
  );
}

export function UpcomingEventsBody({
  events,
  lang,
}: {
  events: Event[];
  lang: AppLanguage;
}) {
  if (events.length === 0) {
    return (
      <Link
        href="/admin/events/new"
        className="block rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-muted transition hover:border-indigo-royal-200 hover:text-ink"
      >
        {t('dashboard.upcoming_events_empty', lang)}
      </Link>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const timeRange = formatEventTimeRange(event.start_time, event.end_time);
        return (
          <li key={event.id}>
            <Link
              href={`/admin/events/${event.id}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 transition hover:border-indigo-royal-200 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {event.title}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatEventDate(event.event_date, lang, { weekday: true })}
                  {timeRange ? ` · ${timeRange}` : ''}
                </p>
              </div>
              <span
                className={
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                  eventTypeTone(event.event_type)
                }
              >
                {eventTypeLabel(event.event_type, lang)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
