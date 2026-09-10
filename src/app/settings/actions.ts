'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type SettingsResult = { ok: true } | { ok: false; error: string };

/**
 * Turn the Rotation module on or off for the caller's own church.
 *
 * A server action rather than the direct client write the rest of this page
 * uses, for two reasons. The org-type rule is not expressible in RLS — the
 * churches UPDATE policy cannot say "this column only when
 * organization_type = 'church'" without a trigger — so it has to be enforced
 * somewhere that runs before the write. And flipping a module on is worth an
 * audit entry, which a browser-side update does not produce.
 *
 * The church id is taken from the session, never from the caller, so there is
 * no id to tamper with.
 */
export async function updateChurchRotationEnabled(
  enabled: boolean,
): Promise<SettingsResult> {
  const me = await getMe();

  if (!canReviewAssignments(me.user.role)) {
    return { ok: false, error: 'not_admin' };
  }
  // Structural, not a preference: a ministry has no rotation to run, so the
  // column stays FALSE for them no matter what reaches this action.
  if (me.church.organization_type !== 'church') {
    return { ok: false, error: 'not_church' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('churches')
    .update({ rotation_enabled: enabled })
    .eq('id', me.church.id)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  // No error and no row means RLS filtered the write — the only shape a
  // policy refusal takes on an authenticated client.
  if (!data) return { ok: false, error: 'not_admin' };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'church_module',
    entityId: me.church.id,
    beforeValue: { rotation_enabled: me.church.rotation_enabled },
    afterValue: { rotation_enabled: enabled },
  });

  // The sidebar lives in the shared layout, so every admin surface has to
  // re-render for the link to appear or disappear.
  revalidatePath('/settings');
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
  return { ok: true };
}
