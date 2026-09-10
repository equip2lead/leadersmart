import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { ROTATION_GROUPS } from '@/lib/types';
import type { Church, RotationStation, ServingGroup, Volunteer } from '@/lib/types';

// Server-only helpers for the sign-up paths.
//
// Why the service-role client: every rotation table is RLS-gated on
// get_my_church_id(), which resolves through auth.uid(). The public sign-up
// form and /me/[token] have no signed-in user, so anon reads and writes are
// refused outright — RLS cannot express "this anonymous person may create
// exactly one volunteer row in exactly this church". The gate has to move
// into application code, which means every function here carries the whole
// burden of tenancy itself. Nothing below may take a church id from the
// caller; each one resolves it from the slug or the token.

/** Slug → church, but only for a church actually accepting sign-ups.
    Returns a reason rather than null so the page can tell "no such church"
    (404) apart from "not accepting yet" (a message), which are different
    things to a person standing at a URL someone gave them. */
export type SlugLookup =
  | { ok: true; church: Church; churchId: string }
  | { ok: false; reason: 'not_found' | 'not_accepting' };

export async function churchBySlug(slug: string): Promise<SlugLookup> {
  // Without the service-role key there is no way to read anything as an
  // anonymous visitor, and createAdminClient() throws. A public URL must not
  // answer a misconfiguration with a 500, so this degrades to "not accepting"
  // — the visitor can do nothing about it either way — and says loudly on the
  // server what is actually wrong.
  if (!hasAdminKey()) {
    console.error(
      '[rotation] SUPABASE_SERVICE_ROLE_KEY is not set — public rotation sign-up is disabled.',
    );
    return { ok: false, reason: 'not_accepting' };
  }

  const admin = createAdminClient();

  const { data: config } = await admin
    .from('rotation_config')
    .select('church_id')
    .eq('church_slug', slug)
    .maybeSingle();
  if (!config) return { ok: false, reason: 'not_found' };

  const { data: church } = await admin
    .from('churches')
    .select('*')
    .eq('id', config.church_id as string)
    .maybeSingle();
  if (!church) return { ok: false, reason: 'not_found' };

  const row = church as Church;
  // A ministry is 404, not "not accepting": the module is not theirs and
  // never will be, so there is nothing to come back for.
  if (row.organization_type !== 'church') return { ok: false, reason: 'not_found' };
  if (!row.rotation_enabled) return { ok: false, reason: 'not_accepting' };

  return { ok: true, church: row, churchId: row.id };
}

/** Stations a volunteer may choose from. Fire Kids is excluded: it needs
    safeguarding approval (rotation_config.senior_pastor_approves_firekids)
    rather than a checkbox on a public form. */
export async function signupStations(churchId: string): Promise<RotationStation[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('rotation_stations')
    .select('*')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .eq('is_fire_kids', false)
    .order('display_order')
    .order('name');
  return (data ?? []) as RotationStation[];
}

/**
 * The rotation group with the fewest active members.
 *
 * This is the "auto-assign to smallest group" rule. Ties break by the fixed
 * A-B-C-D order rather than at random, so seeding an empty church produces
 * A, B, C, D, A… instead of a lumpy sequence.
 *
 * Counts memberships, not volunteers.serving_group, because a volunteer who
 * later joins a second group should count toward both.
 */
export async function smallestRotationGroup(churchId: string): Promise<ServingGroup> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('volunteer_group_memberships')
    .select('serving_group, volunteers!inner(status)')
    .eq('church_id', churchId)
    .eq('volunteers.status', 'active');

  const counts = new Map<ServingGroup, number>(ROTATION_GROUPS.map((g) => [g, 0]));
  for (const row of (data ?? []) as Array<{ serving_group: ServingGroup }>) {
    if (counts.has(row.serving_group)) {
      counts.set(row.serving_group, (counts.get(row.serving_group) ?? 0) + 1);
    }
  }

  let best: ServingGroup = ROTATION_GROUPS[0];
  for (const g of ROTATION_GROUPS) {
    if ((counts.get(g) ?? 0) < (counts.get(best) ?? 0)) best = g;
  }
  return best;
}

/** Volunteer by personal token, with the church that owns them.
    The token is the whole credential, so this is the only lookup: there is no
    church id to cross-check it against, and supplying one would let a caller
    probe which tokens belong where. */
export async function volunteerByToken(
  token: string,
): Promise<{ volunteer: Volunteer; church: Church } | null> {
  // Cheap guard against scanning: the column default is 32 hex characters, so
  // anything else cannot be a real token and need not reach the database.
  if (!/^[a-f0-9]{16,64}$/.test(token)) return null;
  if (!hasAdminKey()) {
    console.error(
      '[rotation] SUPABASE_SERVICE_ROLE_KEY is not set — /me/[token] is disabled.',
    );
    return null;
  }

  const admin = createAdminClient();
  const { data: volunteer } = await admin
    .from('volunteers')
    .select('*')
    .eq('personal_url_token', token)
    .maybeSingle();
  if (!volunteer) return null;

  const { data: church } = await admin
    .from('churches')
    .select('*')
    .eq('id', (volunteer as Volunteer).church_id)
    .maybeSingle();
  if (!church) return null;

  return { volunteer: volunteer as Volunteer, church: church as Church };
}
