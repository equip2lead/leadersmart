import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Confirmation endpoint for regular signup email templates that inline
// {{ .TokenHash }} — parallel to /auth/callback (which handles PKCE codes).
// Route handlers can set cookies, so verifyOtp actually persists the session.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') ?? '/dashboard';

  const origin = url.origin;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_confirmation_params`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    // Supabase's EmailOtpType is a superset of these; we pass through the URL value.
    type: type as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email',
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=confirmation_failed&reason=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
