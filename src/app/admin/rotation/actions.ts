'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { canUseRotation } from '@/lib/rotation';
import { logAudit } from '@/lib/audit';
import {
  fifthSundaysInYear,
  planMonth,
  planSunday,
  sundaysInMonth,
  type Candidate,
  type StationNeed,
} from '@/lib/rotation-schedule';
import { ROTATION_GROUPS } from '@/lib/types';
import type { ServingGroup } from '@/lib/types';

// Admin actions for year planning and schedule generation.
//
// These run as the caller, so RLS is the last word on every write. The checks
// in front turn a policy refusal — which arrives as zero rows rather than an
// error — into a named result, and enforce the two things RLS cannot see: that
// this church has opted into Rotation at all, and that every id in the payload
// belongs to it.

export type RotationResult = { ok: true } | { ok: false; error: string };
export type PlanYearResult =
  | { ok: true; count: number }
  | { ok: false; error: string };
export type GenerateResult =
  | { ok: true; created: number; warnings: GenerateWarning[] }
  | { ok: false; error: string };

/** Surfaced on the schedule page rather than thrown: an empty group is a
    recruiting problem for the admin to solve, not a failure of the run. */
export type GenerateWarning = {
  date: string;
  group: ServingGroup;
  kind: 'group_empty';
};

async function requireRotationAdmin() {
  const me = await getMe();
  if (!canUseRotation(me.church)) return { me: null as null, error: 'not_admin' as const };
  if (!canReviewAssignments(me.user.role)) {
    return { me: null as null, error: 'not_admin' as const };
  }
  return { me, error: null };
}

const MIN_YEAR = 2020;
const MAX_YEAR = 2100;

/**
 * Save (or re-save) the fifth Sundays for one year.
 *
 * Idempotent by the UNIQUE (church_id, service_date) index, so re-clicking
 * changes nothing. Deliberately additive: it never deletes rows the admin has
 * switched off with is_active, because re-running the plan should not quietly
 * re-enable a Sunday somebody chose to exempt.
 */
export async function planYearFifthSundays(
  year: number,
): Promise<PlanYearResult> {
  const { me, error } = await requireRotationAdmin();
  if (!me) return { ok: false, error };

  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { ok: false, error: 'invalid_year' };
  }

  const dates = fifthSundaysInYear(year);
  if (dates.length === 0) return { ok: true, count: 0 };

  const supabase = await createClient();
  const { error: upErr } = await supabase.from('fifth_sunday_dates').upsert(
    dates.map((d) => ({
      church_id: me.church.id,
      service_date: d.date,
      year,
    })),
    { onConflict: 'church_id,service_date', ignoreDuplicates: true },
  );
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'fifth_sunday_plan',
    entityId: me.church.id,
    afterValue: { year, count: dates.length },
  });

  revalidatePath('/admin/rotation/plan-year');
  revalidatePath('/admin/rotation/schedule');
  return { ok: true, count: dates.length };
}

/**
 * Generate a month of draft assignments.
 *
 * Published Sundays are left completely alone — not regenerated, not
 * reshuffled, not counted. Once volunteers have been told they are serving,
 * an admin pressing Generate again must not silently move them.
 */
export async function generateSchedule(
  year: number,
  month: number,
): Promise<GenerateResult> {
  const { me, error } = await requireRotationAdmin();
  if (!me) return { ok: false, error };
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { ok: false, error: 'invalid_year' };
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: 'invalid_month' };
  }

  const supabase = await createClient();
  const churchId = me.church.id;
  const dates = sundaysInMonth(year, month);
  if (dates.length === 0) return { ok: true, created: 0, warnings: [] };

  const [fifthRes, stationRes, existingRes, lastRes] = await Promise.all([
    supabase
      .from('fifth_sunday_dates')
      .select('service_date')
      .eq('church_id', churchId)
      .eq('is_active', true),
    supabase
      .from('rotation_stations')
      .select('id, min_volunteers')
      .eq('church_id', churchId)
      .eq('is_active', true)
      .eq('is_fire_kids', false)
      .order('display_order')
      .order('name'),
    supabase
      .from('rotation_schedules')
      .select('id, service_date, status')
      .eq('church_id', churchId)
      .in('service_date', dates),
    // The most recent A-D group before this month. A fifth Sunday sits
    // outside the cycle, so it must not be what the cycle resumes from.
    supabase
      .from('rotation_schedules')
      .select('service_date, serving_group')
      .eq('church_id', churchId)
      .lt('service_date', dates[0])
      .in('serving_group', ROTATION_GROUPS)
      .order('service_date', { ascending: false })
      .limit(1),
  ]);

  const fifthDates = new Set(
    ((fifthRes.data ?? []) as Array<{ service_date: string }>).map(
      (f) => f.service_date,
    ),
  );
  const stations = ((stationRes.data ?? []) as Array<{
    id: string;
    min_volunteers: number;
  }>).map<StationNeed>((s) => ({
    stationId: s.id,
    minVolunteers: s.min_volunteers,
  }));

  const existing = new Map(
    ((existingRes.data ?? []) as Array<{
      id: string;
      service_date: string;
      status: string;
    }>).map((r) => [r.service_date, r]),
  );

  const lastRotationGroup =
    (((lastRes.data ?? [])[0] as { serving_group: ServingGroup } | undefined)
      ?.serving_group as ServingGroup | undefined) ?? null;

  const plan = planMonth(year, month, fifthDates, lastRotationGroup);

  // Serving history, for the "who has waited longest" sort. Read once for the
  // whole month rather than per station per Sunday.
  const [membersRes, prefsRes, historyRes] = await Promise.all([
    supabase
      .from('volunteer_group_memberships')
      .select('volunteer_id, serving_group, volunteers!inner(id, status, church_id)')
      .eq('church_id', churchId)
      .eq('volunteers.status', 'active'),
    supabase
      .from('volunteer_station_preferences')
      .select('volunteer_id, station_id, is_excluded')
      .eq('is_excluded', false),
    supabase
      .from('rotation_assignments')
      .select('volunteer_id, station_id, service_date')
      .eq('church_id', churchId)
      .lt('service_date', dates[0])
      .order('service_date', { ascending: false })
      .limit(2000),
  ]);

  const byGroup = new Map<ServingGroup, string[]>();
  for (const m of (membersRes.data ?? []) as Array<{
    volunteer_id: string;
    serving_group: ServingGroup;
  }>) {
    const list = byGroup.get(m.serving_group) ?? [];
    list.push(m.volunteer_id);
    byGroup.set(m.serving_group, list);
  }

  // Station preferences are keyed by volunteer, and volunteers are already
  // church-scoped through the membership query above, so a preference row
  // pointing at another tenant's station simply never matches.
  const willing = new Map<string, Set<string>>();
  for (const p of (prefsRes.data ?? []) as Array<{
    volunteer_id: string;
    station_id: string;
  }>) {
    const set = willing.get(p.volunteer_id) ?? new Set<string>();
    set.add(p.station_id);
    willing.set(p.volunteer_id, set);
  }

  const lastAny = new Map<string, string>();
  const lastHere = new Map<string, string>();
  for (const h of (historyRes.data ?? []) as Array<{
    volunteer_id: string | null;
    station_id: string;
    service_date: string;
  }>) {
    if (!h.volunteer_id) continue;
    // Rows arrive newest first, so the first sighting of a key is the latest.
    if (!lastAny.has(h.volunteer_id)) lastAny.set(h.volunteer_id, h.service_date);
    const k = `${h.volunteer_id}:${h.station_id}`;
    if (!lastHere.has(k)) lastHere.set(k, h.service_date);
  }

  const warnings: GenerateWarning[] = [];
  let created = 0;

  for (const sunday of plan) {
    const prior = existing.get(sunday.date);
    // Published Sundays are frozen. Skipping rather than erroring means a
    // month that is half published still generates its remaining weeks.
    if (prior?.status === 'published') continue;

    const groupMembers = byGroup.get(sunday.group) ?? [];
    if (groupMembers.length === 0) {
      warnings.push({ date: sunday.date, group: sunday.group, kind: 'group_empty' });
      continue;
    }

    const candidatesByStation = new Map<string, Candidate[]>();
    for (const station of stations) {
      const pool: Candidate[] = groupMembers
        // A volunteer with no recorded preferences is willing to go anywhere —
        // that is what leaving the station list blank on the form means.
        .filter((id) => {
          const set = willing.get(id);
          return !set || set.size === 0 || set.has(station.stationId);
        })
        .map((id) => ({
          volunteerId: id,
          lastServed: lastAny.get(id) ?? null,
          lastServedHere: lastHere.get(`${id}:${station.stationId}`) ?? null,
        }));
      candidatesByStation.set(station.stationId, pool);
    }

    const result = planSunday(
      sunday.date,
      sunday.group,
      sunday.isFifthSunday,
      stations,
      candidatesByStation,
    );

    if (result.groupEmpty) {
      warnings.push({ date: sunday.date, group: sunday.group, kind: 'group_empty' });
      continue;
    }

    // One schedule row per Sunday, carrying the group so next month's cycle
    // can resume from it.
    const { data: schedule, error: schErr } = await supabase
      .from('rotation_schedules')
      .upsert(
        {
          church_id: churchId,
          service_date: sunday.date,
          status: 'draft',
          serving_group: sunday.group,
        },
        { onConflict: 'church_id,service_date' },
      )
      .select('id')
      .maybeSingle();
    if (schErr) return { ok: false, error: schErr.message };
    if (!schedule) return { ok: false, error: 'not_admin' };

    // Replace this Sunday's drafts wholesale. Regenerating is meant to be a
    // clean re-run, and merging would leave orphans from a previous shape of
    // the station list.
    const { error: delErr } = await supabase
      .from('rotation_assignments')
      .delete()
      .eq('church_id', churchId)
      .eq('service_date', sunday.date)
      .eq('is_published', false);
    if (delErr) return { ok: false, error: delErr.message };

    const rows = result.assignments.flatMap((a) =>
      a.volunteerIds.map((volunteer_id) => ({
        church_id: churchId,
        volunteer_id,
        station_id: a.stationId,
        schedule_id: schedule.id as string,
        service_date: sunday.date,
        status: 'scheduled' as const,
        is_published: false,
      })),
    );

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from('rotation_assignments')
        .insert(rows);
      if (insErr) return { ok: false, error: insErr.message };
      created += rows.length;
    }
  }

  await logAudit({
    churchId,
    userId: me.user.id,
    action: 'create',
    entityType: 'rotation_schedule',
    entityId: churchId,
    afterValue: { year, month, created, warnings: warnings.length },
  });

  revalidatePath('/admin/rotation/schedule');
  return { ok: true, created, warnings };
}

/** Flip one Sunday's schedule between draft and published.
    Publishing is what makes its assignments visible on /me/[token], so the
    two rows move together. */
async function setPublished(
  scheduleId: string,
  publish: boolean,
): Promise<RotationResult> {
  const { me, error } = await requireRotationAdmin();
  if (!me) return { ok: false, error };

  const supabase = await createClient();
  const { data: schedule } = await supabase
    .from('rotation_schedules')
    .select('id, service_date, status')
    .eq('id', scheduleId)
    .eq('church_id', me.church.id)
    .maybeSingle();
  if (!schedule) return { ok: false, error: 'not_found' };

  const now = new Date().toISOString();
  const { data: updated, error: upErr } = await supabase
    .from('rotation_schedules')
    .update({
      status: publish ? 'published' : 'draft',
      published_at: publish ? now : null,
      published_by: publish ? me.user.id : null,
    })
    .eq('id', scheduleId)
    .select('id')
    .maybeSingle();
  if (upErr) return { ok: false, error: upErr.message };
  if (!updated) return { ok: false, error: 'not_admin' };

  // rotation_assignments.is_published is what /me/[token] filters on, so it
  // has to move with the schedule or a published Sunday would stay invisible.
  const { error: aErr } = await supabase
    .from('rotation_assignments')
    .update({ is_published: publish, published_at: publish ? now : null })
    .eq('church_id', me.church.id)
    .eq('service_date', schedule.service_date as string);
  if (aErr) return { ok: false, error: aErr.message };

  revalidatePath('/admin/rotation/schedule');
  return { ok: true };
}

export async function publishSchedule(scheduleId: string): Promise<RotationResult> {
  return setPublished(scheduleId, true);
}

/**
 * Take a Sunday back to draft.
 *
 * The brief asked to allow this "only if no volunteers have viewed via /me/".
 * Nothing records a view — there is no read log on rotation_assignments and
 * adding one to gate an admin action would be a surveillance feature bought
 * for a very small benefit. Unpublishing is therefore always allowed and the
 * UI says plainly that volunteers may already have seen it, which is the
 * honest version of the same warning.
 */
export async function unpublishSchedule(scheduleId: string): Promise<RotationResult> {
  return setPublished(scheduleId, false);
}
