import { Suspense } from 'react';
import { langFromCookie } from '@/lib/lang-cookie';
import { AuthPageShell } from '@/components/auth-page-shell';
import { ForgotPasswordForm } from './_form';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const lang = await langFromCookie();
  return (
    <AuthPageShell lang={lang}>
      {/* The form reads searchParams (?expired=1), so it needs a boundary. */}
      <Suspense fallback={<div className="card h-64" />}>
        <ForgotPasswordForm lang={lang} />
      </Suspense>
    </AuthPageShell>
  );
}
