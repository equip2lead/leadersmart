'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { canReviewAssignments, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { canUseRotation } from '@/lib/rotation';
import { logAudit } from '@/lib/audit';
import { FIFTH_SUNDAY_GROUP, SERVING_GROUPS } from '@/lib/types';
import { looksLikePhone, normalisePhone } from '@/lib/whatsapp/provider';
import type { ServingGroup, VolunteerStatus } from '@/lib/types';

// Admin actions on the volunteer directory.
//
// Unlike the public sign-up these run as the caller, so RLS is the last word.
// The checks in front turn a policy refusal — which arrives as zero rows, not
// an error — into a named result the UI can translate.

export type VolunteerResult = { ok: true } | { ok: false; error: string };

async function requireRotationAdmin() {
  const me = await getMe();
  if (!canUseRotation(me.church)) return { me: null as null, error: 'not_admin' as const };
  if (!canReviewAssignments(me.user.role)) {
    return { me: null as null, error: 'not_admin' as const };
  }
  return { me, error: null };
}

/** Narrow a list of volunteer ids to those actually in the caller's church.
    Ids arrive from a checkbox list in the browser, so they are input, not
    fact — an id from another tenant must simply vanish rather than be acted
    on. Returns only what survives. */
async function ownedVolunteerIds(
  ids: string[],
  churchId: string,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('volunteers')
    .select('id')
    .eq('church_id', churchId)
    .in('id', ids);
  return ((data ?? []) as Array<{ id: string }>).map((v) => v.id);
}

/**
 * Add or remove Group E for a set of volunteers.
 *
 * Group E stacks on top of a regular group rather than replacing it, so this
 * only ever touches membership rows — volunteers.serving_group, the primary
 * group, is deliberately left alone. The one exception is removal from a
 * volunteer whose primary group *is* E: they would be left in no group at
 * all, so that case is refused rather than silently orphaning them.
 */
export async function setGroupEMembership(
  volunteerIds: string[],
  member: boolean,
): Promise<VolunteerResult> {
  const { me, error } = await requireRotationAdmin();
  if (!me) return { ok: false, error };

  const ids = await ownedVolunteerIds(volunteerIds, me.church.id);
  if (ids.length === 0) return { ok: false, error: 'no_selection' };

  const supabase = await createClient();

  if (member) {
    // Idempotent via UNIQUE (volunteer_id, serving_group): adding someone who
    // is already in E is a no-op, not a duplicate.
    const { error: upErr } = await supabase
      .from('volunteer_group_memberships')
      .upsert(
        ids.map((volunteer_id) => ({
          church_id: me.church.id,
          volunteer_id,
          serving_group: FIFTH_SUNDAY_GROUP,
        })),
        { onConflict: 'volunteer_id,serving_group' },
      );
    if (upErr) return { ok: false, error: upErr.message };
  } else {
    // Fifth-Sunday-only volunteers keep their membership: stripping it would
    // leave them belonging to nothing while volunteers.serving_group still
    // says 'E'.
    const { data: eOnly } = await supabase
      .from('volunteers')
      .select('id')
      .in('id', ids)
      .eq('serving_group', FIFTH_SUNDAY_GROUP);
    const protectedIds = new Set(
      ((eOnly ?? []) as Array<{ id: string }>).map((v) => v.id),
    );
    const removable = ids.filter((id) => !protectedIds.has(id));
    if (removable.length === 0) return { ok: false, error: 'no_selection' };

    const { error: delErr } = await supabase
      .from('volunteer_group_memberships')
      .delete()
      .eq('serving_group', FIFTH_SUNDAY_GROUP)
      .in('volunteer_id', removable);
    if (delErr) return { ok: false, error: delErr.message };
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'volunteer_group_membership',
    entityId: me.church.id,
    afterValue: { group: FIFTH_SUNDAY_GROUP, member, count: ids.length },
  });

  revalidatePath('/admin/rotation/volunteers');
  return { ok: true };
}

export async function setVolunteerStatus(
  volunteerId: string,
  status: VolunteerStatus,
): Promise<VolunteerResult> {
  const { me, error } = await requireRotationAdmin();
  if (!me) return { ok: false, error };

  const ids = await ownedVolunteerIds([volunteerId], me.church.id);
  if (ids.length === 0) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { data, error: upErr } = await supabase
    .from('volunteers')
    .update({ status })
    .eq('id', volunteerId)
    .select('id')
    .maybeSingle();
  if (upErr) return { ok: false, error: upErr.message };
  if (!data) return { ok: false, error: 'not_admin' };

  revalidatePath('/admin/rotation/volunteers');
  return { ok: true };
}

export async function deleteVolunteer(
  volunteerId: string,
): Promise<VolunteerResult> {
  const me = await getMe();
  if (!canUseRotation(me.church)) return { ok: false, error: 'not_admin' };
  // Stricter than the rest, matching the destructive-delete convention used
  // throughout this schema. Deactivating is the reversible verb an
  // admin_pastor gets.
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const ids = await ownedVolunteerIds([volunteerId], me.church.id);
  if (ids.length === 0) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  // Memberships, preferences and assignments all cascade from volunteers, so
  // this one delete takes the whole record with it.
  const { error: delErr } = await supabase
    .from('volunteers')
    .delete()
    .eq('id', volunteerId);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'volunteer',
    entityId: volunteerId,
    afterValue: { deleted: true },
  });

  revalidatePath('/admin/rotation/volunteers');
  return { ok: true };
}

/**
 * Delete every seeded fixture in this church.
 *
 * Scoped by is_test_data, not by a name pattern. That is the entire reason the
 * column exists: a fixture named "Clarisse Atangana" is indistinguishable from
 * a real sign-up by inspection, and a LIKE-based purge against realistic names
 * is one typo away from deleting a congregation's actual volunteers.
 *
 * Owner only, matching the single-delete rule — this removes more, not less.
 */
export async function purgeTestVolunteers(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  const me = await getMe();
  if (!canUseRotation(me.church)) return { ok: false, error: 'not_admin' };
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const supabase = await createClient();
  // Memberships, preferences and assignments all cascade from volunteers.
  const { data, error } = await supabase
    .from('volunteers')
    .delete()
    .eq('church_id', me.church.id)
    .eq('is_test_data', true)
    .select('id');
  if (error) return { ok: false, error: error.message };

  const count = (data ?? []).length;
  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'volunteer',
    entityId: me.church.id,
    afterValue: { purged_test_volunteers: count },
  });

  revalidatePath('/admin/rotation/volunteers');
  revalidatePath('/admin/rotation/schedule');
  return { ok: true, count };
}

export type UpdateVolunteerInput = {
  fullName: string;
  phone: string;
  email: string | null;
  groups: ServingGroup[];
  stationIds: string[];
};

/**
 * Correct a volunteer's details.
 *
 * Exists because sign-up is self-service and public: a mistyped digit in a
 * phone number means the assignment message goes nowhere, and the volunteer
 * has no way to fix it themselves.
 *
 * Groups and stations are reconciled as sets rather than replaced wholesale.
 * A delete-then-insert would churn joined_at on memberships the edit never
 * touched, losing when someone actually joined a group.
 */
export async function updateVolunteer(
  volunteerId: string,
  input: UpdateVolunteerInput,
): Promise<VolunteerResult> {
  const { me, error } = await requireRotationAdmin();
  if (!me) return { ok: false, error };

  const ids = await ownedVolunteerIds([volunteerId], me.church.id);
  if (ids.length === 0) return { ok: false, error: 'not_found' };

  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: 'name_required' };
  if (fullName.length > 120) return { ok: false, error: 'name_too_long' };

  // The same normaliser the public form runs through, so a number corrected
  // here is stored in exactly the shape a number typed at sign-up would be.
  const phone = normalisePhone(input.phone);
  if (!looksLikePhone(phone)) return { ok: false, error: 'invalid_phone' };

  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }

  const groups = [...new Set(input.groups)].filter((g) =>
    SERVING_GROUPS.includes(g),
  );
  // A volunteer in no group is invisible to the generator — they would sit in
  // the directory forever and never be rostered.
  if (groups.length === 0) return { ok: false, error: 'group_required' };

  const supabase = await createClient();

  // Stations are intersected with this church's own list. The ids come from a
  // browser, so they are input rather than fact.
  const { data: allowedStations } = await supabase
    .from('rotation_stations')
    .select('id')
    .eq('church_id', me.church.id)
    .eq('is_active', true)
    .eq('is_fire_kids', false);
  const allowed = new Set(
    ((allowedStations ?? []) as Array<{ id: string }>).map((s) => s.id),
  );
  const stationIds = [...new Set(input.stationIds)].filter((id) => allowed.has(id));

  const { data: before } = await supabase
    .from('volunteers')
    .select('full_name, whatsapp_phone, email')
    .eq('id', volunteerId)
    .maybeSingle();

  const { data: updated, error: upErr } = await supabase
    .from('volunteers')
    .update({
      full_name: fullName,
      whatsapp_phone: phone,
      email,
      // Primary group is the first chosen. volunteers.serving_group is NOT
      // NULL and still means "their main group"; the memberships table is
      // what expresses holding several.
      serving_group: groups[0],
    })
    .eq('id', volunteerId)
    .select('id')
    .maybeSingle();
  if (upErr) return { ok: false, error: upErr.message };
  if (!updated) return { ok: false, error: 'not_admin' };

  // ── Reconcile group memberships ──────────────────────────────────────────
  const { data: currentGroups } = await supabase
    .from('volunteer_group_memberships')
    .select('serving_group')
    .eq('volunteer_id', volunteerId);
  const have = new Set(
    ((currentGroups ?? []) as Array<{ serving_group: ServingGroup }>).map(
      (g) => g.serving_group,
    ),
  );
  const want = new Set(groups);

  const toAdd = groups.filter((g) => !have.has(g));
  const toRemove = [...have].filter((g) => !want.has(g));

  if (toAdd.length > 0) {
    const { error: addErr } = await supabase
      .from('volunteer_group_memberships')
      .upsert(
        toAdd.map((g) => ({
          church_id: me.church.id,
          volunteer_id: volunteerId,
          serving_group: g,
        })),
        { onConflict: 'volunteer_id,serving_group' },
      );
    if (addErr) return { ok: false, error: addErr.message };
  }
  if (toRemove.length > 0) {
    const { error: remErr } = await supabase
      .from('volunteer_group_memberships')
      .delete()
      .eq('volunteer_id', volunteerId)
      .in('serving_group', toRemove);
    if (remErr) return { ok: false, error: remErr.message };
  }

  // ── Reconcile station preferences ────────────────────────────────────────
  const { data: currentStations } = await supabase
    .from('volunteer_station_preferences')
    .select('station_id')
    .eq('volunteer_id', volunteerId)
    .eq('is_excluded', false);
  const haveStations = new Set(
    ((currentStations ?? []) as Array<{ station_id: string }>).map(
      (s) => s.station_id,
    ),
  );
  const wantStations = new Set(stationIds);

  const addStations = stationIds.filter((id) => !haveStations.has(id));
  const removeStations = [...haveStations].filter((id) => !wantStations.has(id));

  if (addStations.length > 0) {
    const { error: addErr } = await supabase
      .from('volunteer_station_preferences')
      .insert(
        addStations.map((station_id) => ({
          volunteer_id: volunteerId,
          station_id,
          is_excluded: false,
        })),
      );
    if (addErr) return { ok: false, error: addErr.message };
  }
  if (removeStations.length > 0) {
    const { error: remErr } = await supabase
      .from('volunteer_station_preferences')
      .delete()
      .eq('volunteer_id', volunteerId)
      .eq('is_excluded', false)
      .in('station_id', removeStations);
    if (remErr) return { ok: false, error: remErr.message };
  }

  // The existing audit_log already carries a 'volunteer' entity type, so no
  // separate volunteer audit table is needed. Phone and email are recorded
  // because a wrong number is exactly what this edit exists to fix, and
  // knowing what it was is what makes a mistaken "fix" recoverable.
  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'volunteer',
    entityId: volunteerId,
    beforeValue: {
      full_name: before?.full_name,
      phone: before?.whatsapp_phone,
      email: before?.email,
    },
    afterValue: {
      full_name: fullName,
      phone,
      email,
      groups,
      stations: stationIds.length,
    },
  });

  revalidatePath('/admin/rotation/volunteers');
  revalidatePath('/admin/rotation/schedule');
  return { ok: true };
}
