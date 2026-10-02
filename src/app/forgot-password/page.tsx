'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flame, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  // /reset-password sends people here when they arrive without a session —
  // an expired or already-used link. Saying so beats a bare empty form.
  const expired = searchParams.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password` },
      );
      // A failure here is a transport or rate-limit problem, not "no such
      // account" — Supabase does not distinguish, and neither do we.
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch {
      setError(t('auth.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  // The success state replaces the form rather than sitting above it. Leaving
  // the form in place invites a second submit, which only burns the rate limit.
  if (sent) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-ink">{t('auth.forgot.title')}</h1>
        <p role="status" className="mt-2 text-sm text-body">
          {t('auth.forgot.success_message')}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-royal-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('auth.forgot.back_to_login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-center text-2xl font-bold text-ink">
        {t('auth.forgot.title')}
      </h1>
      <p className="mt-1 text-center text-sm text-body">
        {t('auth.forgot.subtitle')}
      </p>

      {expired && (
        <p className="mt-6 rounded-lg bg-gold-warm-50 px-4 py-3 text-sm text-gold-warm-800">
          {t('auth.forgot.link_expired')}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="fp-email">
            {t('auth.forgot.email_label')}
          </label>
          <input
            id="fp-email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || email.trim().length === 0}
          className="btn-primary w-full"
        >
          {loading ? t('common.loading') : t('auth.forgot.submit_button')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-semibold text-indigo-royal-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('auth.forgot.back_to_login')}
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-ink"
        >
          <Flame className="h-8 w-8 text-gold-warm-600" aria-hidden="true" />
          <span className="text-xl font-bold">LeaderSmart</span>
        </Link>
        <Suspense fallback={<div className="card h-64" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
