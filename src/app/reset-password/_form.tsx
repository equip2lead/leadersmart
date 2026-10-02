'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import { PASSWORD_MIN_LENGTH, passwordProblemKey, validateNewPassword } from '@/lib/password';
import type { AppLanguage } from '@/lib/types';

export function ResetPasswordForm({ lang }: { lang: AppLanguage }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setError(t(passwordProblemKey(problem), lang));
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setDone(true);
      // The recovery session is already a real session, so there is nowhere to
      // sign in to — refresh so the server sees the new credential, then go.
      router.refresh();
      setTimeout(() => router.push('/admin'), 1200);
    } catch {
      setError(t('auth.error.generic', lang));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <p role="status" className="mt-4 text-sm font-semibold text-ink">
          {t('auth.reset.success_toast', lang)}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-center text-2xl font-bold text-ink">
        {t('auth.reset.title', lang)}
      </h1>
      <p className="mt-1 text-center text-sm text-body">
        {t('auth.reset.subtitle', lang)}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="rp-new">
            {t('auth.reset.new_password_label', lang)}
          </label>
          <input
            id="rp-new"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            autoFocus
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* Stated up front, not only after a rejection. */}
          <p className="mt-1.5 text-xs text-muted">
            {t('auth.reset.requirements_hint', lang)}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="rp-confirm">
            {t('auth.reset.confirm_password_label', lang)}
          </label>
          <input
            id="rp-confirm"
            type="password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || password.length === 0 || confirm.length === 0}
          className="btn-primary w-full"
        >
          {saving ? t('common.loading', lang) : t('auth.reset.submit_button', lang)}
        </button>
      </form>
    </div>
  );
}
