import { Suspense } from 'react';
import { langFromCookie } from '@/lib/lang-cookie';
import { AuthPageShell } from '@/components/auth-page-shell';
import { LoginForm } from './_form';

// A server component now, where it used to be entirely client-side. The
// language has to be known before the first paint — rendering English and
// then swapping to French after hydration is exactly the flicker a
// Francophone visitor would read as the page not supporting their language.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const lang = await langFromCookie();
  return (
    <AuthPageShell lang={lang}>
      {/* LoginForm reads searchParams, so it needs its own boundary. */}
      <Suspense fallback={<div className="card h-96" />}>
        <LoginForm lang={lang} />
      </Suspense>
    </AuthPageShell>
  );
}
