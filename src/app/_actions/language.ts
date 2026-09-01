'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { AppLanguage } from '@/lib/types';

export type LanguageResult = { ok: true } | { ok: false; error: string };

// Switches the signed-in user's interface language. Every authenticated
// page reads user.preferred_language server-side, so persisting it here
// is all that's needed — the re-render picks it up.
//
// No role gate: changing your own display language is not privileged, and
// the update is scoped to auth.uid() so it cannot touch anyone else.
export async function setUserLanguage(
  lang: AppLanguage,
): Promise<LanguageResult> {
  if (lang !== 'en' && lang !== 'fr') {
    return { ok: false, error: 'invalid_language' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'not_authenticated' };

  const { error } = await supabase
    .from('users')
    .update({ preferred_language: lang })
    .eq('id', user.id);
  if (error) return { ok: false, error: error.message };

  // The shell is rendered by five separate layouts; revalidating the root
  // layout path covers all of them in one call.
  revalidatePath('/', 'layout');
  return { ok: true };
}
