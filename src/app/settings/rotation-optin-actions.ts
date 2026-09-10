'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canUseRotation } from '@/lib/rotation';
import { ROTATION_GROUPS } from '@/lib/types';
import type { ServingGroup } from '@/lib/types';

// In-app opt-in: an existing user joining the rotation from their own
// settings. Distinct from the public form in one way that matters — this
// caller IS an authenticated user, so it runs as them under RLS and links the
// new volunteers row to users.id, which the public path cannot do.

export type OptInResult = { ok: true; token: string } | { ok: false; error: string };

export async function joinRotation(
  groups: string[],
): Promise<OptInResult> {
  const me = await getMe();
  if (!canUseRotation(me.church)) return { ok: false, error: 'not_admin' };

  const supabase = await createClient();

  // Already signed up? Hand back the existing token rather than creating a
  // second volunteer row for the same person.
  const { data: existing } = await supabase
    .from('volunteers')
    .select('id, personal_url_token')
    .eq('church_id', me.church.id)
    .eq('user_id', me.user.id)
    .maybeSingle();
  if (existing) {
    return { ok: true, token: existing.personal_url_token as string };
  }

  const chosen = [...new Set(groups)].filter((g) =>
    ROTATION_GROUPS.includes(g as ServingGroup),
  ) as ServingGroup[];

  // Group balance is computed here rather than reusing the public helper,
  // which needs the service role. Under RLS this reads the caller's own
  // church, which is the only one they can see anyway.
  let primary: ServingGroup;
  if (chosen.length > 0) {
    primary = chosen[0];
  } else {
    const { data: rows } = await supabase
      .from('volunteer_group_memberships')
      .select('serving_group')
      .eq('church_id', me.church.id);
    const counts = new Map<ServingGroup, number>(ROTATION_GROUPS.map((g) => [g, 0]));
    for (const r of (rows ?? []) as Array<{ serving_group: ServingGroup }>) {
      if (counts.has(r.serving_group)) {
        counts.set(r.serving_group, (counts.get(r.serving_group) ?? 0) + 1);
      }
    }
    primary = ROTATION_GROUPS.reduce((best, g) =>
      (counts.get(g) ?? 0) < (counts.get(best) ?? 0) ? g : best,
    );
  }

  const { data: created, error: insErr } = await supabase
    .from('volunteers')
    .insert({
      church_id: me.church.id,
      user_id: me.user.id,
      full_name: me.user.full_name,
      whatsapp_phone: me.user.phone ?? '',
      email: me.user.email,
      serving_group: primary,
      status: 'active',
    })
    .select('id, personal_url_token')
    .maybeSingle();
  if (insErr) return { ok: false, error: insErr.message };
  if (!created) return { ok: false, error: 'not_admin' };

  const memberships = chosen.length > 0 ? chosen : [primary];
  const { error: gErr } = await supabase
    .from('volunteer_group_memberships')
    .upsert(
      memberships.map((g) => ({
        church_id: me.church.id,
        volunteer_id: created.id as string,
        serving_group: g,
      })),
      { onConflict: 'volunteer_id,serving_group' },
    );
  if (gErr) return { ok: false, error: gErr.message };

  revalidatePath('/settings');
  revalidatePath('/admin/rotation/volunteers');
  return { ok: true, token: created.personal_url_token as string };
}
