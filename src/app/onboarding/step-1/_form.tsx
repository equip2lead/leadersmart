'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { COUNTRIES } from '../_countries';
import { saveChurchProfile } from '../actions';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB — matches spec.
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

export function Step1Form({
  lang,
  churchId,
  initial,
}: {
  lang: AppLanguage;
  churchId: string;
  initial: {
    name: string;
    country: string;
    language: AppLanguage;
    logoUrl: string | null;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [country, setCountry] = useState(initial.country);
  const [language, setLanguage] = useState<AppLanguage>(initial.language);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onLogoChange(file: File | null) {
    setError(null);
    if (!file) return;
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError(t('onboarding.step1.logoInvalidType', lang));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(t('onboarding.step1.logoTooBig', lang));
      return;
    }

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      // Path convention: `<churchId>/logo-<timestamp>.<ext>` — namespaced
      // to church so a hostile upload can't overwrite another church's
      // file (RLS blocks writes to other bucket paths anyway, but this
      // is defence-in-depth).
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${churchId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('church-logos')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage
        .from('church-logos')
        .getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
    } finally {
      setUploadingLogo(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveChurchProfile({
        name,
        country,
        language,
        logoUrl,
      });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.push('/onboarding/step-2');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="label" htmlFor="church-name">
          {t('onboarding.step1.nameLabel', lang)}
        </label>
        <input
          id="church-name"
          className="input"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="church-country">
          {t('onboarding.step1.countryLabel', lang)}
        </label>
        <select
          id="church-country"
          className="input"
          required
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">
            {t('onboarding.step1.countryPlaceholder', lang)}
          </option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">
          {t('onboarding.step1.languageLabel', lang)}
        </legend>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {(['en', 'fr'] as const).map((code) => {
            const active = language === code;
            return (
              <label
                key={code}
                className={
                  'cursor-pointer rounded-xl border-2 p-4 text-center transition ' +
                  (active
                    ? 'border-indigo-royal-700 bg-indigo-royal-50 text-indigo-royal-700'
                    : 'border-gray-200 bg-white text-body hover:border-gray-300')
                }
              >
                <input
                  type="radio"
                  name="language"
                  value={code}
                  checked={active}
                  onChange={() => setLanguage(code)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold">
                  {code === 'en' ? 'English' : 'Français'}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="church-logo">
          {t('onboarding.step1.logoLabel', lang)}
        </label>
        {logoUrl ? (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
            <p className="flex-1 truncate text-sm text-body">
              {t('onboarding.step1.logoUploaded', lang)}
            </p>
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="rounded-md p-1 text-muted hover:bg-white hover:text-ink"
              aria-label={t('common.delete', lang)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-muted transition hover:border-gray-400 hover:bg-gray-50">
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>
              {uploadingLogo
                ? t('onboarding.step1.logoUploading', lang)
                : t('onboarding.step1.logoHint', lang)}
            </span>
            <input
              id="church-logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="sr-only"
              onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
              disabled={uploadingLogo}
            />
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={pending || uploadingLogo}
          className="btn-primary"
        >
          {pending
            ? t('common.loading', lang)
            : t('onboarding.saveContinue', lang)}
        </button>
      </div>
    </form>
  );
}

function mapError(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'name_required':
      return t('onboarding.step1.errNameRequired', lang);
    case 'name_too_long':
      return t('onboarding.step1.errNameTooLong', lang);
    case 'invalid_country':
      return t('onboarding.step1.errCountry', lang);
    case 'invalid_language':
      return t('onboarding.step1.errLanguage', lang);
    case 'not_owner':
      return t('onboarding.errNotOwner', lang);
    default:
      return code;
  }
}
