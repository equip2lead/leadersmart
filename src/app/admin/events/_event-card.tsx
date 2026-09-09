import Link from 'next/link';
import { Clock, MapPin, User as UserIcon } from 'lucide-react';
import { t } from '@/lib/i18n';
import { eventTypeLabel } from '@/lib/vocabulary';
import {
  EVENT_STATUS_CLASS,
  eventTypeTone,
  formatEventDate,
  formatEventTimeRange,
} from '@/lib/events';
import type { AppLanguage, Event } from '@/lib/types';

// One row in the events list. A server component — nothing here is
// interactive beyond the link wrapping it.

export type EventCardData = {
  event: Event;
  coordinatorName: string | null;
  /** Pre-resolved scope label, or null for an org-wide event. The card does
      not know whether it came from a branch or a department; the page does. */
  scopeLabel: string | null;
};

export function EventCard({
  data,
  lang,
}: {
  data: EventCardData;
  lang: AppLanguage;
}) {
  const { event, coordinatorName, scopeLabel } = data;
  const timeRange = formatEventTimeRange(event.start_time, event.end_time);

  return (
    <li>
      <Link
        href={`/admin/events/${event.id}`}
        className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-royal-200 hover:shadow-card sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                  eventTypeTone(event.event_type)
                }
              >
                {eventTypeLabel(event.event_type, lang)}
              </span>
              {scopeLabel && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-body">
                  {scopeLabel}
                </span>
              )}
            </div>

            <h3 className="mt-1.5 font-manrope text-base font-bold leading-snug text-ink">
              {event.title}
            </h3>

            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
              <span className="font-medium">
                {formatEventDate(event.event_date, lang, { weekday: true })}
              </span>
              {timeRange && (
                <span className="inline-flex items-center gap-1 text-muted">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {timeRange}
                </span>
              )}
            </p>

            {(event.location || coordinatorName) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {event.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {event.location}
                  </span>
                )}
                {coordinatorName && (
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="h-3 w-3" aria-hidden="true" />
                    {coordinatorName}
                  </span>
                )}
              </p>
            )}
          </div>

          <span
            className={
              'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ' +
              EVENT_STATUS_CLASS[event.status]
            }
          >
            {t(`events.status.${event.status}`, lang)}
          </span>
        </div>
      </Link>
    </li>
  );
}
