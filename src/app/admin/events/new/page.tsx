import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { EventForm } from '../_event-form';
import { loadEventFormContext } from '../_scope';

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  const { user, church } = await getMe();
  // App-side half of the guard; the events_insert policy is the other half.
  // A non-admin lands back on the list rather than a 403 — the list is a page
  // they are allowed to see.
  if (!canReviewAssignments(user.role)) redirect('/admin/events');

  const lang = user.preferred_language;
  const ctx = await loadEventFormContext(church, lang);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href="/admin/events"
        className="text-sm font-medium text-muted hover:text-ink"
      >
        {t('events.back_link', lang)}
      </Link>

      <div className="mt-4">
        <PageHeading
          title={t('events.new_title', lang)}
          subtitle={t('events.new_subtitle', lang)}
        />
      </div>

      <div className="mt-8">
        <EventForm
          lang={lang}
          scopeKind={ctx.scopeKind}
          scopeOptions={ctx.scopeOptions}
          scopeLabel={ctx.scopeLabel}
          people={ctx.people}
          eventTypes={ctx.eventTypes}
        />
      </div>
    </div>
  );
}
