import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { currencyForCountry } from '@/lib/currency';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not remove the getUser() call — it refreshes the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Routes that don't require auth.
  //
  // /rotation and /me are the volunteer-facing surfaces: a volunteer is
  // usually not an app user, and requiring an account is exactly what stops
  // people signing up. Neither is unguarded — /rotation/[slug] resolves the
  // church from the slug and refuses one that is a ministry or has not opted
  // in, and /me/[token] treats the token as the whole credential. Their
  // protection is in the page, not in this redirect.
  //
  // The ADMIN rotation screens live under /admin/rotation and stay behind
  // both this check and their own layout guard.
  const publicRoutes = ['/', '/login', '/signup', '/auth', '/rotation', '/me'];
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Redirect unauthenticated users trying to access protected routes
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Geo-detect currency on first visit and set a long-lived cookie the
  // landing page reads server-side. Skip when the visitor has already
  // chosen (either via first visit or the manual dropdown) so we never
  // clobber their preference. x-vercel-ip-country is populated by
  // Vercel's edge network in production; missing in local dev.
  if (!request.cookies.get('preferred_currency')) {
    const country = request.headers.get('x-vercel-ip-country');
    const currency = currencyForCountry(country ?? null);
    supabaseResponse.cookies.set('preferred_currency', currency, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return supabaseResponse;
}
