'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Send } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import {
  saveWhatsAppConfig,
  sendWhatsAppTest,
  setWhatsAppEnabled,
} from './whatsapp-actions';

// The WhatsApp settings panel.
//
// The saved access token is never sent to this component — only the last four
// characters, masked on the server. So the token field starts empty and blank
// means "keep what is stored"; it is not a controlled mirror of a secret.

export type WhatsAppSummary = {
  provider: string;
  isEnabled: boolean;
  tokenHint: string | null;
  instanceId: string | null;
  lastTestSentAt: string | null;
  lastTestStatus: string | null;
};

function mapError(code: string, lang: AppLanguage): string {
  const key = `settings.whatsapp.err.${code}`;
  const translated = t(key, lang);
  // Provider error strings are passed through untranslated rather than hidden:
  // "invalid_token" from the gateway is more useful to whoever is debugging
  // than a generic failure message.
  return translated === key ? code : translated;
}

function relativeTime(iso: string, lang: AppLanguage): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  const rtf = new Intl.RelativeTimeFormat(lang === 'fr' ? 'fr' : 'en', {
    numeric: 'auto',
  });
  if (mins < 1) return rtf.format(-Math.round(diff / 1000), 'second');
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

export function WhatsAppForm({
  lang,
  summary,
  defaultTestPhone,
}: {
  lang: AppLanguage;
  summary: WhatsAppSummary | null;
  /** The owner's own number, so the common case needs no typing. */
  defaultTestPhone: string;
}) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [instanceId, setInstanceId] = useState(summary?.instanceId ?? '');
  const [testPhone, setTestPhone] = useState(defaultTestPhone);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const enabled = summary?.isEnabled ?? false;
  const tested = summary?.lastTestStatus === 'success';
  const configured = !!summary?.instanceId && !!summary?.tokenHint;

  function save() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await saveWhatsAppConfig({
        provider: 'wamatas',
        accessToken,
        instanceId,
      });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      // Cleared so the field never holds a secret longer than the submit.
      setAccessToken('');
      setNotice(t('settings.whatsapp.saved', lang));
      router.refresh();
    });
  }

  function test() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendWhatsAppTest(testPhone);
      if (!res.ok) {
        setError(
          t('settings.whatsapp.test_failed', lang).replace(
            '{error}',
            mapError(res.error, lang),
          ),
        );
        router.refresh();
        return;
      }
      // A send with no provider reference is still a send; the message simply
      // cannot be correlated later, and the copy says that instead of printing
      // an empty slot.
      setNotice(
        res.providerMessageId
          ? t('settings.whatsapp.test_success', lang).replace(
              '{providerMessageId}',
              res.providerMessageId,
            )
          : t('settings.whatsapp.test_success_no_id', lang),
      );
      router.refresh();
    });
  }

  function toggleEnabled() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await setWhatsAppEnabled(!enabled);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-5">
      <p className="text-sm text-body">{t('settings.whatsapp.description', lang)}</p>

      <div>
        <label className="label" htmlFor="wa-provider">
          {t('settings.whatsapp.provider_label', lang)}
        </label>
        <select id="wa-provider" className="input" value="wamatas" disabled>
          <option value="wamatas">{t('settings.whatsapp.provider_wamatas', lang)}</option>
          {/* Present but disabled: the CHECK constraint accepts them so a
              church can be migrated later, but neither adapter exists yet. */}
          <option value="genuka" disabled>
            {t('settings.whatsapp.provider_genuka', lang)} —{' '}
            {t('settings.whatsapp.coming_soon', lang)}
          </option>
          <option value="meta_cloud" disabled>
            {t('settings.whatsapp.provider_meta', lang)} —{' '}
            {t('settings.whatsapp.coming_soon', lang)}
          </option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="wa-token">
          {t('settings.whatsapp.access_token_label', lang)}
        </label>
        <div className="flex gap-2">
          <input
            id="wa-token"
            // Defaults to masked; the reveal is for checking a paste, not for
            // leaving a credential on screen.
            type={showToken ? 'text' : 'password'}
            className="input"
            value={accessToken}
            disabled={pending}
            autoComplete="off"
            spellCheck={false}
            placeholder={
              summary?.tokenHint
                ? t('settings.whatsapp.access_token_saved', lang).replace(
                    '{hint}',
                    summary.tokenHint,
                  )
                : ''
            }
            onChange={(e) => setAccessToken(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            aria-label={t(
              showToken ? 'settings.whatsapp.hide' : 'settings.whatsapp.reveal',
              lang,
            )}
            className="btn-secondary shrink-0 !px-3"
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {t('settings.whatsapp.access_token_hint', lang)}
          {summary?.tokenHint && ` ${t('settings.whatsapp.access_token_replace', lang)}`}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="wa-instance">
          {t('settings.whatsapp.instance_id_label', lang)}
        </label>
        <input
          id="wa-instance"
          className="input"
          value={instanceId}
          disabled={pending}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setInstanceId(e.target.value)}
        />
      </div>

      <button type="button" className="btn-primary" disabled={pending} onClick={save}>
        {t('settings.whatsapp.save', lang)}
      </button>

      <div className="border-t border-gray-100 pt-5">
        <label className="label" htmlFor="wa-test-phone">
          {t('settings.whatsapp.test_phone_prompt', lang)}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="wa-test-phone"
            type="tel"
            className="input"
            value={testPhone}
            disabled={pending}
            placeholder="+237…"
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary shrink-0"
            disabled={pending || !configured || testPhone.trim().length === 0}
            onClick={test}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {pending
              ? t('settings.whatsapp.test_sending', lang)
              : t('settings.whatsapp.test_button', lang)}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {t('settings.whatsapp.test_phone_hint', lang)}
        </p>

        <p className="mt-3 text-xs text-muted">
          {summary?.lastTestSentAt
            ? t('settings.whatsapp.last_test', lang)
                .replace('{time}', relativeTime(summary.lastTestSentAt, lang))
                .replace(
                  '{status}',
                  summary.lastTestStatus === 'success'
                    ? t('settings.whatsapp.status_success', lang)
                    : (summary.lastTestStatus ?? '—'),
                )
            : configured
              ? t('settings.whatsapp.never_tested', lang)
              : t('settings.whatsapp.not_configured', lang)}
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {t('settings.whatsapp.enable_toggle', lang)}
          </p>
          <p className="mt-1 text-xs text-body">
            {t('settings.whatsapp.enable_hint', lang)}
          </p>
          {!tested && !enabled && (
            <p className="mt-1 text-xs text-muted">
              {t('settings.whatsapp.enable_blocked', lang)}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t('settings.whatsapp.enable_toggle', lang)}
          disabled={pending || (!enabled && !tested)}
          onClick={toggleEnabled}
          className={
            'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-royal-500 focus:ring-offset-2 ' +
            (enabled ? 'bg-indigo-royal-700' : 'bg-gray-300')
          }
        >
          <span
            className={
              'inline-block h-4 w-4 transform rounded-full bg-white transition ' +
              (enabled ? 'translate-x-6' : 'translate-x-1')
            }
          />
        </button>
      </div>

      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
