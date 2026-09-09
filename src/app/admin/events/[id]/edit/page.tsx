import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { formatEventTime } from '@/lib/events';
import { PageHeading } from '@/components/page-heading';
import type { Event } from '@/lib/types';
import { EventForm } from '../../_event-form';
import { loadEventFormContext } from '../../_scope';

export const dynamic = 'force-dynamic';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, church } = await getMe();
  if (!canReviewAssignments(user.role)) redirect(`/admin/events/${id}`);

  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('church_id', church.id)
    .maybeSingle();
  if (!row) notFound();
  const event = row as Event;

  // The stored type is passed through so a value the org's current list no
  // longer offers stays selected rather than silently resetting.
  const ctx = await loadEventFormContext(church, lang, event.event_type);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href={`/admin/events/${event.id}`}
        className="text-sm font-medium text-muted hover:text-ink"
      >
        {t('events.back_link', lang)}
      </Link>

      <div className="mt-4">
        <PageHeading title={t('events.detail.edit', lang)} subtitle={event.title} />
      </div>

      <div className="mt-8">
        <EventForm
          lang={lang}
          scopeKind={ctx.scopeKind}
          scopeOptions={ctx.scopeOptions}
          scopeLabel={ctx.scopeLabel}
          people={ctx.people}
          eventTypes={ctx.eventTypes}
          initial={{
            id: event.id,
            status: event.status,
            title: event.title,
            eventType: event.event_type,
            eventDate: event.event_date,
            // <input type="time"> wants HH:MM; Postgres hands back HH:MM:SS,
            // and the seconds make the control reject the value silently.
            startTime: formatEventTime(event.start_time),
            endTime: formatEventTime(event.end_time),
            location: event.location,
            description: event.description,
            branchId: event.branch_id,
            departmentId: event.department_id,
            coordinatorUserId: event.coordinator_user_id,
          }}
        />
      </div>
    </div>
  );
}
