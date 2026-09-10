'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { canReviewAssignments, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { canUseRotation } from '@/lib/rotation';
import { logAudit } from '@/lib/audit';
import { FIFTH_SUNDAY_GROUP } from '@/lib/types';
import type { VolunteerStatus } from '@/lib/types';

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
