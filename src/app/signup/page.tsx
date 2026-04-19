'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            church_name: churchName,
            preferred_language: language,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Email confirmation required → no session yet.
      // Church + user row will be created on first /dashboard visit after confirm.
      if (!data.session || !data.user) {
        router.push('/login?check=email');
        return;
      }

      // Session available → provision church + user row now.
      const { data: church, error: churchError } = await supabase
        .from('churches')
        .insert({ name: churchName, language })
        .select('id')
        .single();

      if (churchError || !church) {
        setError(churchError?.message ?? t('auth.error.generic'));
        return;
      }

      const { error: userError } = await supabase.from('users').insert({
        id: data.user.id,
        church_id: church.id,
        full_name: fullName,
        email,
        role: 'senior_pastor',
        preferred_language: language,
      });

      if (userError) {
        setError(userError.message);
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-ink"
        >
          <Flame className="h-8 w-8 text-flame-600" aria-hidden="true" />
          <span className="text-xl font-bold">LeaderSmart</span>
        </Link>

        <div className="card">
          <h1 className="text-center text-2xl font-bold text-ink">
            {t('auth.signup.title')}
          </h1>
          <p className="mt-1 text-center text-sm text-body">
            {t('auth.signup.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="fullName">
                {t('auth.signup.yourName')}
              </label>
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="churchName">
                {t('auth.signup.churchName')}
              </label>
              <input
                id="churchName"
                type="text"
                required
                className="input"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="email">
                {t('auth.signup.email')}
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
                {t('auth.signup.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <fieldset>
              <legend className="label">{t('auth.signup.language')}</legend>
              <div className="flex gap-3">
                <label
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    language === 'en'
                      ? 'border-brand-700 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-body hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={language === 'en'}
                    onChange={() => setLanguage('en')}
                    className="sr-only"
                  />
                  English
                </label>
                <label
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    language === 'fr'
                      ? 'border-brand-700 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-body hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value="fr"
                    checked={language === 'fr'}
                    onChange={() => setLanguage('fr')}
                    className="sr-only"
                  />
                  Français
                </label>
              </div>
            </fieldset>

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
              {loading ? t('common.loading') : t('auth.signup.button')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-body">
            {t('auth.signup.hasAccount')}{' '}
            <Link
              href="/login"
              className="font-semibold text-brand-700 hover:underline"
            >
              {t('auth.signup.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
