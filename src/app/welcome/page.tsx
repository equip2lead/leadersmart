import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { langFor } from '@/lib/lang-cookie';
import { AuthPageShell } from '@/components/auth-page-shell';
import type { AppLanguage } from '@/lib/types';
import { WelcomeForm } from './_form';

export const dynamic = 'force-dynamic';

// The one step between Google consent and the setup wizard.
//
// It exists for a narrow reason: bootstrap_my_church needs a church name, and
// a Google identity has none — that value only ever came from our own signup
// form's field. So a Google-first user cannot be provisioned until they type
// it, and cannot reach /onboarding until they are provisioned.
//
// Anyone who does not need it is sent straight on, so this page is invisible
// to every existing flow.
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Already provisioned — /dashboard routes by role from here.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (existing) redirect('/dashboard');

  // Invited users have a church already; bootstrap handles them without a
  // name, and /dashboard runs it.
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (typeof appMeta.inviting_church_id === 'string') redirect('/dashboard');

  const meta = user.user_metadata ?? {};
  const suggestedName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    '';
  // No users row yet, so there is no stored preference — the cookie, then the
  // identity metadata, are the only hints available.
  const lang = await langFor(
    (meta.preferred_language === 'fr' ? 'fr' : null) as AppLanguage | null,
  );

  return (
    <AuthPageShell lang={lang}>
      <WelcomeForm lang={lang} suggestedName={suggestedName} />
    </AuthPageShell>
  );
}
