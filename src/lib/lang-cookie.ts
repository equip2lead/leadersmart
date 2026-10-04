import { cookies } from 'next/headers';
import type { AppLanguage } from './types';

// The anonymous visitor's language, read server-side so the first paint is
// already correct rather than flipping after hydration.
//
// `preferred_lang` is the same cookie the landing page's LangToggle writes, so
// a choice made on the marketing site carries into /login and onward without
// anything extra. It is deliberately NOT users.preferred_language: these pages
// are reachable with no users row at all (and /login with no session), so the
// profile column is not available to read.

export const LANG_COOKIE = 'preferred_lang';

/** Reads the cookie. Anything that is not 'fr' — missing, stale, junk — is 'en'. */
export async function langFromCookie(): Promise<AppLanguage> {
  const jar = await cookies();
  return jar.get(LANG_COOKIE)?.value === 'fr' ? 'fr' : 'en';
}

/**
 * The language for a page that may also know the signed-in user's stored
 * preference.
 *
 * The cookie wins when present, because it is the more recent deliberate act:
 * someone who just pressed FR on this page expects FR, even if their profile
 * still says 'en'. With no cookie, the stored preference is better than
 * guessing.
 */
export async function langFor(stored?: AppLanguage | null): Promise<AppLanguage> {
  const jar = await cookies();
  const cookie = jar.get(LANG_COOKIE)?.value;
  if (cookie === 'fr' || cookie === 'en') return cookie;
  return stored ?? 'en';
}
