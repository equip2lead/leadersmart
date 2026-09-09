import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { getVocab } from '@/lib/vocabulary';
import { PageHeading } from '@/components/page-heading';
import {
  EVENT_TABS,
  filterEventsForTab,
  todayISO,
  type EventTab,
} from '@/lib/events';
import type { Branch, Department, Event } from '@/lib/types';
import { EventCard, type EventCardData } from './_event-card';

export const dynamic = 'force-dynamic';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  // Any signed-in member of the church may read the list — an event is
  // something the team executes together. Only admins get the create button
  // and the drafts tab.
  const { user, church } = await getMe();
  const lang = user.preferred_language;
  const canManage = canReviewAssignments(user.role);
  const v = getVocab(church.organization_type, lang);
  const supabase = await createClient();

  const requested = (params.tab ?? 'upcoming') as EventTab;
  // A non-admin who types ?tab=drafts lands on Upcoming rather than an empty
  // list, so the tab cannot be used to infer that drafts exist.
  const tab: EventTab =
    EVENT_TABS.includes(requested) && (requested !== 'drafts' || canManage)
      ? requested
      : 'upcoming';

  const { data: eventRows } = await supabase
    .from('events')
    .select('*')
    .eq('church_id', church.id)
    .order('event_date', { ascending: tab === 'past' })
    .order('start_time', { ascending: true, nullsFirst: true });
  const all = (eventRows ?? []) as Event[];

  // Drafts never reach a non-admin, whatever the tab. RLS lets the whole
  // church SELECT events, so this is the only thing keeping an unpublished
  // event out of a volunteer's list.
  const visible = canManage ? all : all.filter((e) => e.status !== 'draft');
  const events = filterEventsForTab(visible, tab, todayISO());

  // Resolve the three lookups the cards need, for the filtered set only.
  const coordinatorIds = [
    ...new Set(events.map((e) => e.coordinator_user_id).filter(Boolean)),
  ] as string[];
  const branchIds = [...new Set(events.map((e) => e.branch_id).filter(Boolean))] as string[];
  const deptIds = [...new Set(events.map((e) => e.department_id).filter(Boolean))] as string[];

  const [userRes, branchRes, deptRes] = await Promise.all([
    coordinatorIds.length
      ? supabase.from('users').select('id, full_name').in('id', coordinatorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    branchIds.length
      ? supabase.from('branches').select('id, name').in('id', branchIds)
      : Promise.resolve({ data: [] as Pick<Branch, 'id' | 'name'>[] }),
    deptIds.length
      ? supabase.from('departments').select('id, name').in('id', deptIds)
      : Promise.resolve({ data: [] as Pick<Department, 'id' | 'name'>[] }),
  ]);

  const nameById = new Map((userRes.data ?? []).map((u) => [u.id, u.full_name]));
  const branchById = new Map((branchRes.data ?? []).map((b) => [b.id, b.name]));
  const deptById = new Map((deptRes.data ?? []).map((d) => [d.id, d.name]));

  const cards: EventCardData[] = events.map((event) => ({
    event,
    coordinatorName: event.coordinator_user_id
      ? (nameById.get(event.coordinator_user_id) ?? null)
      : null,
    // The label uses the org's own word for the unit, so a ministry reads
    // "Branch: Douala" and a church "Department: Worship".
    scopeLabel: event.branch_id
      ? t('events.detail.scope_branch', lang).replace(
          '{name}',
          branchById.get(event.branch_id) ?? '—',
        )
      : event.department_id
        ? `${v.department}: ${deptById.get(event.department_id) ?? '—'}`
        : null,
  }));

  const tabs: EventTab[] = canManage
    ? EVENT_TABS
    : EVENT_TABS.filter((x) => x !== 'drafts');

  // "No events at all" and "nothing under this filter" are different
  // situations and get different copy — the first invites a first event, the
  // second just says the tab is empty.
  const churchHasNoEvents = visible.length === 0;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('events.page_title', lang)}
        subtitle={t('events.page_subtitle', lang)}
        actions={
          canManage ? (
            <Link href="/admin/events/new" className="btn-primary">
              {t('events.new_button', lang)}
            </Link>
          ) : undefined
        }
      />

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map((key) => {
          const active = key === tab;
          return (
            <Link
              key={key}
              href={`/admin/events?tab=${key}`}
              aria-current={active ? 'page' : undefined}
              className={
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ' +
                (active
                  ? 'border-indigo-royal-700 text-indigo-royal-700'
                  : 'border-transparent text-muted hover:text-ink')
              }
            >
              {t(`events.tab_${key}`, lang)}
            </Link>
          );
        })}
      </nav>

      {cards.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <Calendar className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
          {churchHasNoEvents ? (
            <>
              <p className="mt-3 text-sm font-semibold text-ink">
                {t('events.empty_title', lang)}
              </p>
              <p className="mt-1 text-sm text-body">
                {t('events.empty_body', lang)}
              </p>
              {canManage && (
                <Link href="/admin/events/new" className="btn-primary mt-5">
                  {t('events.new_button', lang)}
                </Link>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-body">{t('events.empty_tab', lang)}</p>
          )}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {cards.map((data) => (
            <EventCard key={data.event.id} data={data} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  );
}
