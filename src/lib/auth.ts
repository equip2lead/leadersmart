import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Church, User, UserRole } from '@/lib/types';

export type Me = {
  authUserId: string;
  authEmail: string | null;
  user: User;
  church: Church;
};

export async function getMe(): Promise<Me> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  // No row → bounce through /dashboard which runs the recovery path.
  if (!user) {
    redirect('/dashboard');
  }

  const { data: church } = await supabase
    .from('churches')
    .select('*')
    .eq('id', user.church_id)
    .maybeSingle();

  if (!church) {
    redirect('/login?error=no_church');
  }

  return {
    authUserId: authUser.id,
    authEmail: authUser.email ?? null,
    user: user as User,
    church: church as Church,
  };
}

export async function requireRole(allowed: UserRole[]): Promise<Me> {
  const me = await getMe();
  if (!allowed.includes(me.user.role)) {
    // Send them to /dashboard — it'll redirect to their correct home.
    redirect('/dashboard');
  }
  return me;
}
