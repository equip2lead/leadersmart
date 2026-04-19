'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showCheckEmail = searchParams.get('check') === 'email';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(t('auth.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-center text-2xl font-bold text-ink">
        {t('auth.login.title')}
      </h1>
      <p className="mt-1 text-center text-sm text-body">
        {t('auth.login.subtitle')}
      </p>

      {showCheckEmail && (
        <p className="mt-6 rounded-lg bg-flame-50 px-4 py-3 text-sm text-flame-800">
          {t('auth.checkEmail')}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">
            {t('auth.login.email')}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            {t('auth.login.password')}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-500"
            />
            {t('auth.login.remember')}
          </label>
          <a
            href="#"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {t('auth.login.forgot')}
          </a>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? t('common.loading') : t('auth.login.button')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-body">
        {t('auth.login.noAccount')}{' '}
        <Link
          href="/signup"
          className="font-semibold text-brand-700 hover:underline"
        >
          {t('auth.login.signupLink')}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-ink"
        >
          <Flame className="h-8 w-8 text-flame-600" aria-hidden="true" />
          <span className="text-xl font-bold">LeaderSmart</span>
        </Link>
        <Suspense fallback={<div className="card h-96" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
