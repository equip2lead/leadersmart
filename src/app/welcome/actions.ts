'use server';

import { createClient } from '@/lib/supabase/server';

export type CompleteSignupResult = { ok: true } | { ok: false; error: string };

/** Longest church name the form accepts, matched to the signup form's field. */
const MAX_ORG_NAME = 120;

/**
 * Provision the tenant for someone who arrived without a church name.
 *
 * Calls the same bootstrap_my_church the email signup path uses, so there is
 * still exactly one place that creates a church and its owner row. The only
 * difference is where the name comes from: the signup form puts it in user
 * metadata before the account exists, and a Google identity cannot, so it is
 * typed here instead.
 *
 * Idempotent by virtue of the function itself — bootstrap_my_church returns
 * the existing church_id when the caller already has a users row, so a double
 * submit cannot create a second church.
 */
export async function completeGoogleSignup(
  orgName: string,
  fullName: string,
): Promise<CompleteSignupResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'not_authenticated' };

  const name = orgName.trim();
  if (name.length === 0) return { ok: false, error: 'org_name_required' };
  if (name.length > MAX_ORG_NAME) return { ok: false, error: 'org_name_too_long' };

  // Google gives us a display name; fall back to the email local part rather
  // than storing an empty full_name, which would render as a blank greeting.
  const meta = user.user_metadata ?? {};
  const resolvedName =
    fullName.trim() ||
    (typeof meta.full_name === 'string' ? meta.full_name : '') ||
    (typeof meta.name === 'string' ? meta.name : '') ||
    (user.email ?? '').split('@')[0];

  const language = meta.preferred_language === 'fr' ? 'fr' : 'en';

  const { error } = await supabase.rpc('bootstrap_my_church', {
    p_church_name: name,
    p_full_name: resolvedName,
    p_language: language,
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
