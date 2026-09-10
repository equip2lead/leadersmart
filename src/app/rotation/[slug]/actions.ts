'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  churchBySlug,
  signupStations,
  smallestRotationGroup,
} from '@/lib/rotation-signup';
import { FIFTH_SUNDAY_GROUP, ROTATION_GROUPS, SERVING_GROUPS } from '@/lib/types';
import type { ServingGroup } from '@/lib/types';

// The public sign-up. Unauthenticated by design — a volunteer is usually not
// an app user, and requiring an account is what stops people signing up.
//
// Because it is unauthenticated it runs as the service role, which means RLS
// protects nothing here and every rule is enforced below. The two that matter:
// the church is resolved from the slug and never taken from the caller, and
// station ids are intersected with that church's own stations, so a crafted
// request cannot attach a volunteer to another tenant's station.

// Not exported: a 'use server' file may export only async functions, and
// nothing outside this module needs these.
const MAX_NAME = 120;
const MAX_PHONE = 40;

export type SignupResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export type SignupInput = {
  slug: string;
  fullName: string;
  phone: string;
  email: string | null;
  stationIds: string[];
  groups: string[];
  consent: boolean;
};

function clean(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  return s.length > 0 ? s : null;
}

export async function submitRotationSignup(
  input: SignupInput,
): Promise<SignupResult> {
  const lookup = await churchBySlug(input.slug);
  // Both failure modes collapse to one error here: by the time a form is being
  // submitted the page has already told the visitor which case they are in.
  if (!lookup.ok) return { ok: false, error: 'not_accepting' };
  const churchId = lookup.churchId;

  const fullName = clean(input.fullName);
  if (!fullName) return { ok: false, error: 'name_required' };
  if (fullName.length > MAX_NAME) return { ok: false, error: 'name_too_long' };

  const phone = clean(input.phone);
  if (!phone) return { ok: false, error: 'phone_required' };
  if (phone.length > MAX_PHONE) return { ok: false, error: 'phone_too_long' };

  const email = clean(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'invalid_email' };
  }

  if (!input.consent) return { ok: false, error: 'consent_required' };

  // Station ids are intersected with this church's own list rather than
  // trusted. Anything else is silently dropped — a stale id from a page left
  // open should not fail the whole sign-up.
  const allowed = new Set((await signupStations(churchId)).map((s) => s.id));
  const stationIds = [...new Set(input.stationIds)].filter((id) => allowed.has(id));

  const chosen = [...new Set(input.groups)].filter((g) =>
    SERVING_GROUPS.includes(g as ServingGroup),
  ) as ServingGroup[];

  // Group resolution, in three cases:
  //   nothing chosen        → smallest rotation group, so the load balances
  //   only E                → fifth-Sunday-only volunteer
  //   a rotation group ± E  → take it as given
  // volunteers.serving_group is NOT NULL and stays the *primary* group, so an
  // E-only volunteer stores 'E' there and the memberships table carries the
  // same single row. The two never disagree.
  const rotationPicks = chosen.filter((g) => ROTATION_GROUPS.includes(g));
  const wantsE = chosen.includes(FIFTH_SUNDAY_GROUP);

  let primary: ServingGroup;
  let memberships: ServingGroup[];
  if (rotationPicks.length > 0) {
    primary = rotationPicks[0];
    memberships = wantsE ? [...rotationPicks, FIFTH_SUNDAY_GROUP] : rotationPicks;
  } else if (wantsE) {
    primary = FIFTH_SUNDAY_GROUP;
    memberships = [FIFTH_SUNDAY_GROUP];
  } else {
    primary = await smallestRotationGroup(churchId);
    memberships = [primary];
  }

  const admin = createAdminClient();

  const { data: created, error: insErr } = await admin
    .from('volunteers')
    .insert({
      church_id: churchId,
      full_name: fullName,
      whatsapp_phone: phone,
      email,
      serving_group: primary,
      status: 'active',
      // personal_url_token has a DB default of 32 random hex characters, so
      // it is deliberately not supplied here — the database is a better
      // source of randomness than the request handler.
    })
    .select('id, personal_url_token')
    .maybeSingle();
  if (insErr) return { ok: false, error: insErr.message };
  if (!created) return { ok: false, error: 'signup_failed' };

  const volunteerId = created.id as string;

  if (memberships.length > 0) {
    // Idempotent by the UNIQUE (volunteer_id, serving_group) index, so a
    // double submit cannot produce duplicate memberships.
    const { error: gErr } = await admin
      .from('volunteer_group_memberships')
      .upsert(
        memberships.map((g) => ({
          church_id: churchId,
          volunteer_id: volunteerId,
          serving_group: g,
        })),
        { onConflict: 'volunteer_id,serving_group' },
      );
    if (gErr) return { ok: false, error: gErr.message };
  }

  if (stationIds.length > 0) {
    const { error: sErr } = await admin
      .from('volunteer_station_preferences')
      .insert(
        stationIds.map((station_id) => ({
          volunteer_id: volunteerId,
          station_id,
          is_excluded: false,
        })),
      );
    if (sErr) return { ok: false, error: sErr.message };
  }

  const token = created.personal_url_token as string;
  await sendWelcome(email, fullName, lookup.church.name, token);

  return { ok: true, token };
}

/**
 * Welcome email.
 *
 * There is no Resend integration in this codebase — no dependency, no API key,
 * no existing mail helper — so this logs what it would have sent and returns.
 * The sign-up does not depend on it: the personal URL is shown on the welcome
 * page precisely so that a volunteer who gives no email, or whose email never
 * arrives, still leaves with their link.
 */
async function sendWelcome(
  email: string | null,
  fullName: string,
  churchName: string,
  token: string,
): Promise<void> {
  if (!email) return;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://leadersmart.app';
  console.info(
    `[rotation] welcome email not sent (no mail provider configured) — ` +
      `to=${email} name=${fullName} church=${churchName} url=${base}/me/${token}`,
  );
}
