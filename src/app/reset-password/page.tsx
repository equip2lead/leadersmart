import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
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
  // RLS; if that lookup comes back empty for any reason the page still renders,
  // in English, rather than failing on the way to a password reset.
  const { data: profile } = await supabase
    .from('users')
    .select('preferred_language')
    .eq('id', user.id)
    .maybeSingle();

  const lang = (profile?.preferred_language ?? 'en') as AppLanguage;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-ink"
        >
          <Flame className="h-8 w-8 text-gold-warm-600" aria-hidden="true" />
          <span className="text-xl font-bold">LeaderSmart</span>
        </Link>
        <ResetPasswordForm lang={lang} />
      </div>
    </main>
  );
}
