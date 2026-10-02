import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Confirmation endpoint for email links — signup, invite, and password
// recovery. Route handlers can set cookies, so the session actually persists.
//
// Two different URL shapes arrive here, and which one a project sends is a
// Supabase dashboard setting this code cannot see:
//
//   token_hash + type  — templates that inline {{ .TokenHash }} link straight
//     to this route, and verifyOtp does the work.
//
//   code               — the default {{ .ConfirmationURL }} template points at
//     Supabase first, which verifies the token itself and then redirects here
//     with a PKCE code and no type at all.
//
// Accepting only the first shape is what made the recovery flow unreachable:
// resetPasswordForEmail on the default template produces the second, and the
// old `if (!tokenHash || !type)` guard turned every such link into
// missing_confirmation_params.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  const origin = url.origin;
  const supabase = await createClient();

  let failure: string | null = null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      // Supabase's EmailOtpType is a superset of these; we pass through the URL value.
      type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email',
      token_hash: tokenHash,
    });
    failure = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failure = error?.message ?? null;
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_confirmation_params`);
  }

  if (failure) {
    return NextResponse.redirect(
      `${origin}/login?error=confirmation_failed&reason=${encodeURIComponent(failure)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
