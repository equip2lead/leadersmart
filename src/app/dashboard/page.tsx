import { redirect } from 'next/navigation';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { AppLanguage, UserRole } from '@/lib/types';

const ROLE_HOME: Record<UserRole, string> = {
  senior_pastor: '/admin',
  admin: '/admin',
  pastor: '/pastor',
  department_leader: '/leader',
};

export const dynamic = 'force-dynamic';

function SetupError({ message, detail }: { message: string; detail?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <Flame className="mx-auto h-10 w-10 text-flame-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-ink">Setup incomplete</h1>
        <p className="mt-3 text-sm text-body">{message}</p>
        {detail && (
          <p className="mt-2 break-words rounded-lg bg-red-50 px-4 py-3 text-left text-xs font-mono text-red-700">
            {detail}
          </p>
        )}
        <form action="/auth/signout" method="POST" className="mt-6">
          <button type="submit" className="btn-primary w-full">
            Sign out
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Sign out, then sign up again or contact support.
        </p>
      </div>
    </main>
  );
}

export default async function DashboardRouter() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: existing } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (existing?.role) {
    redirect(ROLE_HOME[existing.role as UserRole] ?? '/admin');
  }

  // Recovery: auth user exists, no user row. Provision church + user from metadata.
  const meta = user.user_metadata ?? {};
  const churchName = typeof meta.church_name === 'string' ? meta.church_name : null;
  const fullName =
    typeof meta.full_name === 'string' ? meta.full_name : (user.email ?? '');
  const preferredLanguage: AppLanguage =
    meta.preferred_language === 'fr' ? 'fr' : 'en';

  if (!churchName) {
    return (
      <SetupError message="Your account is missing the church name from signup. Please sign out and sign up again." />
    );
  }

  const { error: rpcError } = await supabase.rpc('bootstrap_my_church', {
    p_church_name: churchName,
    p_full_name: fullName,
    p_language: preferredLanguage,
  });

  if (rpcError) {
    return (
      <SetupError
        message="We couldn't finish setting up your church. If this is your first signup, the database function bootstrap_my_church may not be installed yet."
        detail={rpcError.message}
      />
    );
  }

  redirect('/admin');
}
