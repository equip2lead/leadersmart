import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, ChevronRight, Clock, MapPin, User as UserIcon } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { canReviewAssignments, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { eventTypeLabel, getVocab } from '@/lib/vocabulary';
import {
  EVENT_STATUS_CLASS,
  eventTypeTone,
  formatEventDate,
  formatEventTimeRange,
} from '@/lib/events';
import type { Event } from '@/lib/types';
import { EventActions } from './_event-actions';

export const dynamic = 'force-dynamic';

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-ink">{value}</p>
      </div>
    </div>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, church } = await getMe();
  const lang = user.preferred_language;
  const canManage = canReviewAssignments(user.role);
  const v = getVocab(church.organization_type, lang);
  const supabase = await createClient();

  // Scoped to the caller's church before anything else: a valid uuid from
  // another tenant must 404 rather than leak a title.
  const { data: row } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('church_id', church.id)
    .maybeSingle();
  if (!row) notFound();
  const event = row as Event;

  // A draft is an admin's working copy. RLS lets the whole church read events,
  // so this is what keeps an unpublished one out of a volunteer's hands.
  if (event.status === 'draft' && !canManage) notFound();

  const [coordRes, branchRes, deptRes] = await Promise.all([
    event.coordinator_user_id
      ? supabase
          .from('users')
          .select('full_name')
          .eq('id', event.coordinator_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    event.branch_id
      ? supabase.from('branches').select('name').eq('id', event.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    event.department_id
      ? supabase
          .from('departments')
          .select('name')
          .eq('id', event.department_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const coordinatorName = (coordRes.data?.full_name as string | undefined) ?? null;
  const timeRange = formatEventTimeRange(event.start_time, event.end_time);

  const scopeLabel = event.branch_id
    ? t('events.detail.scope_branch', lang).replace(
        '{name}',
        (branchRes.data?.name as string | undefined) ?? '—',
      )
    : event.department_id
      ? `${v.department}: ${(deptRes.data?.name as string | undefined) ?? '—'}`
      : null;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-xs text-muted"
      >
        <Link href="/admin/events" className="hover:text-ink">
          {t('events.page_title', lang)}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="font-medium text-body">{event.title}</span>
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
              eventTypeTone(event.event_type)
            }
          >
            {eventTypeLabel(event.event_type, lang)}
          </span>
          <span
            className={
              'rounded-full border px-2.5 py-1 text-xs font-semibold ' +
              EVENT_STATUS_CLASS[event.status]
            }
          >
            {t(`events.status.${event.status}`, lang)}
          </span>
          {scopeLabel && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-body">
              {scopeLabel}
            </span>
          )}
        </div>

        <h1 className="mt-2 font-manrope text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
          {event.title}
        </h1>

        {event.status === 'completed' && event.completed_at && (
          <p className="mt-1.5 text-sm text-emerald-700">
            {t('events.detail.completed_at', lang).replace(
              '{date}',
              formatEventDate(event.completed_at.slice(0, 10), lang),
            )}
          </p>
        )}
        {event.status === 'cancelled' && event.cancelled_at && (
          <p className="mt-1.5 text-sm text-red-700">
            {t('events.detail.cancelled_at', lang).replace(
              '{date}',
              formatEventDate(event.cancelled_at.slice(0, 10), lang),
            )}
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            {t('events.detail.details_title', lang)}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailRow
              icon={CalendarDays}
              label={t('events.detail.date_label', lang)}
              value={formatEventDate(event.event_date, lang, { weekday: true })}
            />
            {timeRange && (
              <DetailRow
                icon={Clock}
                label={t('events.detail.time_label', lang)}
                value={timeRange}
              />
            )}
            {event.location && (
              <DetailRow
                icon={MapPin}
                label={t('events.detail.location_label', lang)}
                value={event.location}
              />
            )}
            <DetailRow
              icon={UserIcon}
              label={t('events.detail.coordinator_label', lang)}
              value={coordinatorName ?? t('events.detail.unassigned', lang)}
            />
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            {event.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
                {event.description}
              </p>
            ) : (
              <p className="text-sm text-muted">
                {t('events.detail.no_description', lang)}
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {canManage && (
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <EventActions
                lang={lang}
                eventId={event.id}
                status={event.status}
                canDelete={isOwner(user.role)}
                postEventNotes={event.post_event_notes}
              />
            </section>
          )}

          {/* Post-event notes are the record of how it actually went, so they
              only appear once there is an "actually" to report. */}
          {event.status === 'completed' && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                {t('events.detail.post_notes_label', lang)}
              </h2>
              {event.post_event_notes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {event.post_event_notes}
                </p>
              ) : (
                <p className="mt-2 text-sm text-emerald-800">
                  {t('events.detail.post_notes_empty', lang)}
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
