'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage, UserRole } from '@/lib/types';

type Stage = 'verifying' | 'ready' | 'error';

type ErrorKind =
  | 'missing_token'
  | 'expired'
  | 'already_used'
  | 'invalid'
  | 'link_error'
  | 'network';

type Profile = {
  fullName: string;
  role: UserRole;
  churchName: string;
  preferredLanguage: AppLanguage;
};

export function AcceptInviteFlow({
  tokenHash,
  type,
  code,
  error,
  errorDescription,
}: {
  tokenHash: string | null;
  type: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('verifying');
  const [errorKind, setErrorKind] = useState<ErrorKind>('missing_token');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const lang: AppLanguage = profile?.preferredLanguage ?? 'en';

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // The users row may not exist yet — bootstrap_my_church is idempotent and
    // will link the invited user to their inviting church using app_metadata.
    const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const invitedFullName =
      typeof meta.invited_full_name === 'string' ? meta.invited_full_name : '';

    await supabase.rpc('bootstrap_my_church', {
      p_church_name: '',
      p_full_name: invitedFullName || user.email || '',
      p_language: 'en',
    });

    const { data: profileRow } = await supabase
      .from('users')
      .select(
        'full_name, role, preferred_language, church:churches!church_id(name)',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (!profileRow) return null;

    const churchRef = profileRow.church as
      | { name: string | null }
      | { name: string | null }[]
      | null;
    const churchRow = Array.isArray(churchRef) ? churchRef[0] : churchRef;

    return {
      fullName: profileRow.full_name || invitedFullName || user.email || '',
      role: profileRow.role as UserRole,
      churchName: churchRow?.name ?? '',
      preferredLanguage: (profileRow.preferred_language as AppLanguage) ?? 'en',
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();

      // If the email link came back with an inline error param (Supabase's
      // /verify endpoint sometimes redirects with error_code/error_description),
      // surface it directly.
      if (error) {
        if (!cancelled) {
          setErrorKind(mapSupabaseError(error, errorDescription));
          setErrorDetail(errorDescription);
          setStage('error');
        }
        return;
      }

      if (!tokenHash && !code) {
        // Already-signed-in re-entry: skip verification and pick up the session.
        const p = await loadProfile();
        if (cancelled) return;
        if (p) {
          setProfile(p);
          setStage('ready');
        } else {
          setErrorKind('missing_token');
          setStage('error');
        }
        return;
      }

      // If a stale session exists (different user), sign it out first so the
      // invite token binds to the right identity.
      const { data: existing } = await supabase.auth.getUser();
      if (existing.user) {
        await supabase.auth.signOut();
      }

      type VerifyErr = { message: string; code?: string; name?: string };
      let verifyErr: VerifyErr | null = null;

      if (tokenHash) {
        const otpType = (type ?? 'invite') as 'invite' | 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'email';
        const { error: e } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (e) verifyErr = { message: e.message, code: (e as unknown as { code?: string }).code, name: e.name };
      } else if (code) {
        // Fallback for PKCE-style links.
        const { error: e } = await supabase.auth.exchangeCodeForSession(code);
        if (e) verifyErr = { message: e.message, code: (e as unknown as { code?: string }).code, name: e.name };
      }

      if (verifyErr) {
        if (!cancelled) {
          setErrorKind(mapSupabaseError(verifyErr.code ?? verifyErr.name, verifyErr.message));
          setErrorDetail(verifyErr.message);
          setStage('error');
        }
        return;
      }

      const p = await loadProfile();
      if (cancelled) return;
      if (!p) {
        setErrorKind('link_error');
        setStage('error');
        return;
      }
      setProfile(p);
      setStage('ready');
    })().catch((err: unknown) => {
      if (cancelled) return;
      setErrorKind('network');
      setErrorDetail(err instanceof Error ? err.message : String(err));
      setStage('error');
    });

    return () => {
      cancelled = true;
    };
  }, [tokenHash, type, code, error, errorDescription, loadProfile]);

  if (stage === 'verifying') {
    return (
      <Shell>
        <p className="text-center text-sm text-muted">{t('accept.verifying', lang)}</p>
      </Shell>
    );
  }

  if (stage === 'error') {
    return (
      <Shell>
        <ErrorPanel kind={errorKind} detail={errorDetail} lang={lang} />
      </Shell>
    );
  }

  return (
    <Shell>
      <WelcomePanel
        profile={profile!}
        lang={lang}
        onDone={() => {
          router.push('/dashboard');
          router.refresh();
        }}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Flame className="h-10 w-10 text-gold-warm-600" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-royal-700">
            LeaderSmart
          </p>
        </div>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}

function ErrorPanel({
  kind,
  detail,
  lang,
}: {
  kind: ErrorKind;
  detail: string | null;
  lang: AppLanguage;
}) {
  const titleKey =
    kind === 'expired'
      ? 'accept.err.expired.title'
      : kind === 'already_used'
        ? 'accept.err.usedTitle'
        : kind === 'missing_token'
          ? 'accept.err.missingToken.title'
          : 'accept.err.generic.title';
  const bodyKey =
    kind === 'expired'
      ? 'accept.err.expired.body'
      : kind === 'already_used'
        ? 'accept.err.usedBody'
        : kind === 'missing_token'
          ? 'accept.err.missingToken.body'
          : 'accept.err.generic.body';

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-ink">{t(titleKey, lang)}</h1>
      <p className="mt-3 text-sm text-body">{t(bodyKey, lang)}</p>
      {detail && (
        <p className="mt-3 break-words rounded-lg bg-red-50 px-3 py-2 text-left text-xs font-mono text-red-700">
          {detail}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2">
        {kind === 'already_used' ? (
          <Link href="/login" className="btn-primary w-full">
            {t('accept.action.signIn', lang)}
          </Link>
        ) : (
          <Link href="/login" className="btn-secondary w-full">
            {t('accept.action.backToLogin', lang)}
          </Link>
        )}
        <p className="mt-2 text-xs text-muted">{t('accept.err.contactAdmin', lang)}</p>
      </div>
    </div>
  );
}

function WelcomePanel({
  profile,
  lang,
  onDone,
}: {
  profile: Profile;
  lang: AppLanguage;
  onDone: () => void;
}) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const firstName = profile.fullName.trim().split(/\s+/)[0] || profile.fullName;
  const roleLabel = t(`role.${profile.role}`, lang);

  const strength = passwordStrength(pw);
  const match = pw.length > 0 && pw === pw2;
  const canSubmit = strength.score >= 2 && match && pw.length >= 8 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        setErr(mapPasswordError(error.message, lang));
        return;
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-center text-2xl font-bold text-ink">
        {t('accept.welcome.title', lang)}
      </h1>
      <p className="mt-3 text-center text-sm text-body">
        {t('accept.welcome.greeting', lang).replace('{name}', firstName)}
      </p>
      <p className="mt-2 text-center text-sm text-body">
        {t('accept.welcome.invited', lang).replace('{church}', profile.churchName)}
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        {t('accept.welcome.roleLine', lang).replace('{role}', roleLabel)}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="pw">
            {t('accept.form.password', lang)}
          </label>
          <div className="relative">
            <input
              id="pw"
              className="input pr-16"
              type={showPw ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute inset-y-0 right-2 my-auto rounded px-2 text-xs font-medium text-indigo-royal-700 hover:bg-indigo-royal-50"
            >
              {showPw ? t('accept.form.hide', lang) : t('accept.form.show', lang)}
            </button>
          </div>
          <StrengthMeter strength={strength} lang={lang} />
        </div>

        <div>
          <label className="label" htmlFor="pw2">
            {t('accept.form.confirm', lang)}
          </label>
          <input
            id="pw2"
            className="input"
            type={showPw ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          {pw2.length > 0 && !match && (
            <p className="mt-1 text-xs text-red-700">
              {t('accept.form.mismatch', lang)}
            </p>
          )}
        </div>

        {err && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </p>
        )}

        <button type="submit" disabled={!canSubmit} className="btn-primary w-full">
          {submitting ? t('common.loading', lang) : t('accept.form.submit', lang)}
        </button>
      </form>
    </div>
  );
}

type Strength = { score: 0 | 1 | 2 | 3 | 4; labelKey: string; color: string };

function passwordStrength(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;
  const buckets: Strength[] = [
    { score: 0, labelKey: 'accept.pw.tooShort', color: 'bg-gray-200' },
    { score: 1, labelKey: 'accept.pw.weak', color: 'bg-red-400' },
    { score: 2, labelKey: 'accept.pw.fair', color: 'bg-amber-400' },
    { score: 3, labelKey: 'accept.pw.good', color: 'bg-emerald-400' },
    { score: 4, labelKey: 'accept.pw.strong', color: 'bg-emerald-600' },
  ];
  return buckets[clamped];
}

function StrengthMeter({
  strength,
  lang,
}: {
  strength: Strength;
  lang: AppLanguage;
}) {
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < strength.score ? strength.color : 'bg-gray-100'
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">{t(strength.labelKey, lang)}</p>
    </div>
  );
}

// Best-effort mapping from Supabase auth error codes to our own UI states.
function mapSupabaseError(
  code: string | null | undefined,
  description: string | null | undefined,
): ErrorKind {
  const c = (code ?? '').toLowerCase();
  const d = (description ?? '').toLowerCase();
  if (c.includes('expired') || d.includes('expired')) return 'expired';
  if (
    c.includes('otp_expired') ||
    c === 'invalid_token' ||
    d.includes('token has expired') ||
    d.includes('invalid') ||
    c.includes('access_denied')
  ) {
    // Supabase reuses invalid_token for both stale and already-consumed cases.
    if (d.includes('expired')) return 'expired';
    return 'already_used';
  }
  return 'link_error';
}

function mapPasswordError(msg: string, lang: AppLanguage): string {
  const m = msg.toLowerCase();
  if (m.includes('weak') || m.includes('pwned') || m.includes('compromised') || m.includes('leaked')) {
    return t('accept.form.pwLeaked', lang);
  }
  if (m.includes('at least') || m.includes('length')) {
    return t('accept.form.pwTooShort', lang);
  }
  return msg;
}
