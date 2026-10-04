import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { langFor } from '@/lib/lang-cookie';
import { AuthPageShell } from '@/components/auth-page-shell';
import type { AppLanguage } from '@/lib/types';
import { ResetPasswordForm } from './_form';

export const dynamic = 'force-dynamic';

// Reached only after /auth/confirm has turned a recovery link into a session.
//
// The guard is "is there a session", not "is this session specifically a
// recovery session". Distinguishing the two would mean reading the JWT's amr
// claims, and it would buy nothing: /settings already lets any signed-in user
// change their password, so a normal session reaching this page can do exactly
// what it could already do by another route. What the check does buy is a
// sensible destination for an expired link, which is the common failure.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/forgot-password?expired=1');

  // Best-effort language. A recovery session can read its own users row under
  // RLS; if that lookup comes back empty for any reason the page still renders
  // rather than failing on the way to a password reset.
  const { data: profile } = await supabase
    .from('users')
    .select('preferred_language')
    .eq('id', user.id)
    .maybeSingle();

  // Cookie first, stored preference second — someone who just pressed FR on
  // this page means it, even when their profile still says 'en'.
  const lang = await langFor(
    (profile?.preferred_language ?? null) as AppLanguage | null,
  );

  return (
    <AuthPageShell lang={lang}>
      <ResetPasswordForm lang={lang} />
    </AuthPageShell>
  );
}
