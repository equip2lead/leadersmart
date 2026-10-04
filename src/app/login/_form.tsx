'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { GoogleSignInButton, OrDivider } from '@/components/google-sign-in-button';

export function LoginForm({ lang }: { lang: AppLanguage }) {
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
      setError(t('auth.error.generic', lang));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-center text-2xl font-bold text-ink">
        {t('auth.login.title', lang)}
      </h1>
      <p className="mt-1 text-center text-sm text-body">
        {t('auth.login.subtitle', lang)}
      </p>

      {showCheckEmail && (
        <p className="mt-6 rounded-lg bg-gold-warm-50 px-4 py-3 text-sm text-gold-warm-800">
          {t('auth.checkEmail', lang)}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">
            {t('auth.login.email', lang)}
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
            {t('auth.login.password', lang)}
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
              className="h-4 w-4 rounded border-gray-300 text-indigo-royal-700 focus:ring-indigo-royal-500"
            />
            {t('auth.login.remember', lang)}
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-indigo-royal-700 hover:underline"
          >
            {t('auth.login.forgot', lang)}
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? t('common.loading', lang) : t('auth.login.button', lang)}
        </button>
      </form>

      {/* Below the form, not above: email/password is the established path and
          most existing accounts have no Google identity linked. */}
      <OrDivider lang={lang} />
      <GoogleSignInButton mode="signin" lang={lang} />

      <p className="mt-6 text-center text-sm text-body">
        {t('auth.login.noAccount', lang)}{' '}
        <Link
          href="/signup"
          className="font-semibold text-indigo-royal-700 hover:underline"
        >
          {t('auth.login.signupLink', lang)}
        </Link>
      </p>
    </div>
  );
}
