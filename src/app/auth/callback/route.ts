import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// OAuth and PKCE landing route. Exchanges the code for a session, then decides
// where the person can actually go.
//
// The routing is not a plain "signed in → /admin". Three states exist after a
// successful exchange, and sending the wrong one to /admin or /onboarding puts
// the user in a loop:
//
//   has a public.users row  → `next`, defaulting to /dashboard. /dashboard is
//     the role router; hardcoding /admin would misroute every pastor and
//     leader, since homeForRole sends those to /pastor and /leader.
//
//   no row, but invited     → /dashboard. bootstrap_my_church takes the
//     invited-user branch off app_metadata.inviting_church_id and needs no
//     church name, so the existing recovery path handles them unchanged.
//
//   no row, not invited     → /welcome. This is the Google-first case, and it
//     is why /welcome has to exist. bootstrap_my_church RAISES 'Church name
//     required' on the self-signup branch, and a Google identity carries no
//     church_name — that only ever came from our own signup form. Sending
//     them to /onboarding instead would bounce: its layout calls getMe(),
//     which redirects to /dashboard when there is no users row, and
//     /dashboard then renders "Setup incomplete" for the missing name. The
//     name has to be collected before provisioning, not after.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const user = data.session?.user;
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // maybeSingle, not single: "no row" is an expected state here, not an error.
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingUser) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (typeof appMeta.inviting_church_id === 'string') {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/welcome`);
}
