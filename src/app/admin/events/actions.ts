'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { canReviewAssignments, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { isKnownEventType } from '@/lib/vocabulary';
import { MAX_EVENT_DESCRIPTION, MAX_EVENT_NOTES, MAX_EVENT_TITLE } from '@/lib/events';
import type { Event, EventStatus } from '@/lib/types';

// Server actions for /admin/events.
//
// Write rights here are has_admin_rights() — owner + admin_pastor — which is
// the same pair canReviewAssignments() names, so the app-side check and the
// RLS policy cannot drift apart. Reads are church-wide and need no gate beyond
// RLS.

export type EventResult = { ok: true; id: string } | { ok: false; error: string };
export type EventVoidResult = { ok: true } | { ok: false; error: string };

export type EventInput = {
  title: string;
  eventType: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  branchId: string | null;
  departmentId: string | null;
  coordinatorUserId: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function clean(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  return s.length > 0 ? s : null;
}

/**
 * Validate the shared shape of create and update.
 *
 * Every foreign key is re-checked against the caller's own church. RLS scopes
 * the events row itself, but branch_id, department_id and coordinator_user_id
 * are references *out* of it, and a policy on `events` says nothing about
 * where those point — without these checks a crafted request could attach
 * another tenant's branch or name their pastor as coordinator.
 */
type Validated =
  | { ok: false; error: string }
  | { ok: true; values: Record<string, unknown> };

async function validate(
  input: EventInput,
  churchId: string,
): Promise<Validated> {
  const title = clean(input.title);
  if (!title) return { ok: false, error: 'title_required' };
  if (title.length > MAX_EVENT_TITLE) return { ok: false, error: 'title_too_long' };

  if (!isKnownEventType(input.eventType)) return { ok: false, error: 'invalid_type' };

  const eventDate = clean(input.eventDate);
  if (!eventDate) return { ok: false, error: 'date_required' };
  if (!DATE_RE.test(eventDate) || Number.isNaN(Date.parse(eventDate))) {
    return { ok: false, error: 'invalid_date' };
  }

  const startTime = clean(input.startTime);
  const endTime = clean(input.endTime);
  for (const tm of [startTime, endTime]) {
    if (tm && !TIME_RE.test(tm)) return { ok: false, error: 'invalid_time' };
  }
  // Compared as strings, which is safe because both are zero-padded HH:MM on
  // the same day. An event that runs past midnight is not expressible in
  // Phase 1 — there is no end *date* — so this rejects rather than silently
  // storing a range that reads as negative.
  if (startTime && endTime && endTime <= startTime) {
    return { ok: false, error: 'end_before_start' };
  }

  const description = clean(input.description);
  if (description && description.length > MAX_EVENT_DESCRIPTION) {
    return { ok: false, error: 'description_too_long' };
  }

  const branchId = clean(input.branchId);
  const departmentId = clean(input.departmentId);
  // Mirrors the events_scope_is_one_of CHECK. Caught here so the user gets a
  // sentence rather than a constraint-violation message.
  if (branchId && departmentId) return { ok: false, error: 'scope_conflict' };

  const supabase = await createClient();

  if (branchId) {
    const { data } = await supabase
      .from('branches')
      .select('id')
      .eq('id', branchId)
      .eq('church_id', churchId)
      .maybeSingle();
    if (!data) return { ok: false, error: 'invalid_branch' };
  }

  if (departmentId) {
    const { data } = await supabase
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .eq('church_id', churchId)
      .maybeSingle();
    if (!data) return { ok: false, error: 'invalid_department' };
  }

  const coordinatorUserId = clean(input.coordinatorUserId);
  if (coordinatorUserId) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', coordinatorUserId)
      .eq('church_id', churchId)
      .maybeSingle();
    if (!data) return { ok: false, error: 'invalid_coordinator' };
  }

  return {
    ok: true,
    values: {
      title,
      event_type: input.eventType,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      location: clean(input.location),
      description,
      branch_id: branchId,
      department_id: departmentId,
      coordinator_user_id: coordinatorUserId,
    },
  };
}

async function requireEventAdmin() {
  const me = await getMe();
  if (!canReviewAssignments(me.user.role)) {
    return { me: null as null, error: 'not_admin' as const };
  }
  return { me, error: null };
}

/** Load an event scoped to the caller's church, or null. */
async function ownedEvent(id: string, churchId: string): Promise<Event | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('church_id', churchId)
    .maybeSingle();
  return (data as Event | null) ?? null;
}

function revalidateEvent(id?: string) {
  revalidatePath('/admin/events');
  revalidatePath('/admin');
  if (id) revalidatePath(`/admin/events/${id}`);
}

export async function createEvent(
  input: EventInput,
  publish: boolean,
): Promise<EventResult> {
  const { me, error } = await requireEventAdmin();
  if (!me) return { ok: false, error };

  const checked = await validate(input, me.church.id);
  if (!checked.ok) return { ok: false, error: checked.error };

  const supabase = await createClient();
  const { data, error: insErr } = await supabase
    .from('events')
    .insert({
      ...checked.values,
      church_id: me.church.id,
      status: publish ? 'published' : 'draft',
      created_by: me.user.id,
    })
    .select('id')
    .maybeSingle();
  if (insErr) return { ok: false, error: insErr.message };
  // No error and no row is how an RLS refusal arrives on an authenticated
  // client — never as a thrown error.
  if (!data) return { ok: false, error: 'not_admin' };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'event',
    entityId: data.id,
    afterValue: { title: checked.values.title, status: publish ? 'published' : 'draft' },
  });

  revalidateEvent(data.id);
  return { ok: true, id: data.id };
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<EventVoidResult> {
  const { me, error } = await requireEventAdmin();
  if (!me) return { ok: false, error };

  const existing = await ownedEvent(id, me.church.id);
  if (!existing) return { ok: false, error: 'not_found' };

  const checked = await validate(input, me.church.id);
  if (!checked.ok) return { ok: false, error: checked.error };

  const supabase = await createClient();
  // status is deliberately absent: transitions are their own actions, so a
  // field edit can never move an event through its lifecycle by accident.
  const { data, error: upErr } = await supabase
    .from('events')
    .update(checked.values)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (upErr) return { ok: false, error: upErr.message };
  if (!data) return { ok: false, error: 'not_admin' };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'event',
    entityId: id,
    beforeValue: { title: existing.title, event_date: existing.event_date },
    afterValue: { title: checked.values.title, event_date: checked.values.event_date },
  });

  revalidateEvent(id);
  return { ok: true };
}

/**
 * Move an event to a new status.
 *
 * The allowed edges are explicit rather than "anything to anything": a
 * cancelled event does not quietly become published again, and completing
 * something that was never published would skip the state the rest of the
 * church can actually see.
 */
const ALLOWED_FROM: Record<Exclude<EventStatus, 'draft'>, EventStatus[]> = {
  published: ['draft'],
  completed: ['published'],
  cancelled: ['draft', 'published', 'completed'],
};

async function transition(
  id: string,
  to: Exclude<EventStatus, 'draft'>,
  extra: Record<string, unknown> = {},
): Promise<EventVoidResult> {
  const { me, error } = await requireEventAdmin();
  if (!me) return { ok: false, error };

  const existing = await ownedEvent(id, me.church.id);
  if (!existing) return { ok: false, error: 'not_found' };
  if (!ALLOWED_FROM[to].includes(existing.status)) {
    return { ok: false, error: 'bad_transition' };
  }

  const supabase = await createClient();
  const { data, error: upErr } = await supabase
    .from('events')
    .update({ status: to, ...extra })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (upErr) return { ok: false, error: upErr.message };
  if (!data) return { ok: false, error: 'not_admin' };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'event',
    entityId: id,
    beforeValue: { status: existing.status },
    afterValue: { status: to },
  });

  revalidateEvent(id);
  return { ok: true };
}

export async function publishEvent(id: string): Promise<EventVoidResult> {
  return transition(id, 'published');
}

export async function markEventCompleted(
  id: string,
  postEventNotes?: string | null,
): Promise<EventVoidResult> {
  const notes = clean(postEventNotes ?? null);
  if (notes && notes.length > MAX_EVENT_NOTES) {
    return { ok: false, error: 'notes_too_long' };
  }
  return transition(id, 'completed', {
    completed_at: new Date().toISOString(),
    // Only written when something was said, so completing without a note
    // does not blank a note added earlier.
    ...(notes ? { post_event_notes: notes } : {}),
  });
}

export async function cancelEvent(id: string): Promise<EventVoidResult> {
  return transition(id, 'cancelled', { cancelled_at: new Date().toISOString() });
}

/** Edit the post-event notes after the fact, without re-running the
    completion transition. */
export async function updateEventNotes(
  id: string,
  postEventNotes: string,
): Promise<EventVoidResult> {
  const { me, error } = await requireEventAdmin();
  if (!me) return { ok: false, error };

  const notes = clean(postEventNotes);
  if (notes && notes.length > MAX_EVENT_NOTES) {
    return { ok: false, error: 'notes_too_long' };
  }

  const existing = await ownedEvent(id, me.church.id);
  if (!existing) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { data, error: upErr } = await supabase
    .from('events')
    .update({ post_event_notes: notes })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (upErr) return { ok: false, error: upErr.message };
  if (!data) return { ok: false, error: 'not_admin' };

  revalidateEvent(id);
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<EventVoidResult> {
  const me = await getMe();
  // Deliberately stricter than the other actions, matching the events_delete
  // policy. An admin_pastor cancels; only the owner destroys.
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const existing = await ownedEvent(id, me.church.id);
  if (!existing) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { error: delErr } = await supabase.from('events').delete().eq('id', id);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'event',
    entityId: id,
    beforeValue: { title: existing.title, status: existing.status },
    afterValue: { deleted: true },
  });

  revalidateEvent();
  return { ok: true };
}
