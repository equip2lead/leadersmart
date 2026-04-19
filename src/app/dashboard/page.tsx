import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AppLanguage, UserRole } from '@/lib/types';

const ROLE_HOME: Record<UserRole, string> = {
  senior_pastor: '/admin',
  admin: '/admin',
  pastor: '/pastor',
  department_leader: '/leader',
};

export const dynamic = 'force-dynamic';

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
    redirect(ROLE_HOME[existing.role as UserRole] ?? '/login');
  }

  // Recovery path: auth user exists but no user row (email-confirm signup, or
  // interrupted client-side provisioning). Provision church + user from the
  // signup metadata we stashed in auth.users.user_metadata.
  const meta = user.user_metadata ?? {};
  const churchName = typeof meta.church_name === 'string' ? meta.church_name : null;
  const fullName = typeof meta.full_name === 'string' ? meta.full_name : user.email ?? '';
  const preferredLanguage: AppLanguage =
    meta.preferred_language === 'fr' ? 'fr' : 'en';

  if (!churchName) {
    redirect('/login?error=missing_setup');
  }

  const { data: church, error: churchError } = await supabase
    .from('churches')
    .insert({ name: churchName, language: preferredLanguage })
    .select('id')
    .single();

  if (churchError || !church) {
    redirect('/login?error=setup_failed');
  }

  const { error: userError } = await supabase.from('users').insert({
    id: user.id,
    church_id: church.id,
    full_name: fullName,
    email: user.email!,
    role: 'senior_pastor',
    preferred_language: preferredLanguage,
  });

  if (userError) {
    redirect('/login?error=setup_failed');
  }

  redirect('/admin');
}
