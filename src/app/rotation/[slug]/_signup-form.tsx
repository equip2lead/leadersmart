'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { FIFTH_SUNDAY_GROUP, ROTATION_GROUPS } from '@/lib/types';
import type { AppLanguage, ServingGroup } from '@/lib/types';
import { submitRotationSignup } from './actions';

export type StationOption = { id: string; name: string };

function mapError(code: string, lang: AppLanguage): string {
  const key = `rotation.signup.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition hover:border-indigo-royal-200">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-royal-700 focus:ring-indigo-royal-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function SignupForm({
  lang,
  slug,
  stations,
}: {
  lang: AppLanguage;
  slug: string;
  stations: StationOption[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<ServingGroup[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitRotationSignup({
        slug,
        fullName,
        phone,
        email: email || null,
        stationIds,
        groups,
        consent,
      });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      // The token goes in the URL because the welcome page is the volunteer's
      // one chance to save their personal link — there is no account to log
      // back into and retrieve it from.
      router.push(`/rotation/${slug}/welcome?token=${res.token}`);
    });
  }

  const canSubmit =
    fullName.trim().length > 0 && phone.trim().length > 0 && consent && !pending;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="signup-name">
            {t('rotation.signup.name_label', lang)}
          </label>
          <input
            id="signup-name"
            className="input"
            value={fullName}
            disabled={pending}
            autoComplete="name"
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="signup-phone">
            {t('rotation.signup.phone_label', lang)}
          </label>
          <input
            id="signup-phone"
            type="tel"
            className="input"
            value={phone}
            disabled={pending}
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">
            {t('rotation.signup.phone_hint', lang)}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="signup-email">
            {t('rotation.signup.email_label', lang)}
          </label>
          <input
            id="signup-email"
            type="email"
            className="input"
            value={email}
            disabled={pending}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <fieldset>
        <legend className="label">{t('rotation.signup.stations_label', lang)}</legend>
        {stations.length === 0 ? (
          <p className="text-sm text-muted">{t('rotation.signup.no_stations', lang)}</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">
              {t('rotation.signup.stations_hint', lang)}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {stations.map((s) => (
                <CheckRow
                  key={s.id}
                  checked={stationIds.includes(s.id)}
                  disabled={pending}
                  onChange={() => setStationIds((prev) => toggle(prev, s.id))}
                  label={s.name}
                />
              ))}
            </div>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend className="label">{t('rotation.signup.groups_label', lang)}</legend>
        <p className="mb-2 text-xs text-muted">
          {t('rotation.signup.groups_hint', lang)}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROTATION_GROUPS.map((g) => (
            <CheckRow
              key={g}
              checked={groups.includes(g)}
              disabled={pending}
              onChange={() => setGroups((prev) => toggle(prev, g))}
              label={t(`rotation.group.${g}`, lang)}
            />
          ))}
        </div>
        {/* Group E is separated from A-D because it is not a fifth option in
            the same list — it is a different kind of commitment that stacks on
            top of whatever was chosen above. */}
        <div className="mt-2">
          <CheckRow
            checked={groups.includes(FIFTH_SUNDAY_GROUP)}
            disabled={pending}
            onChange={() => setGroups((prev) => toggle(prev, FIFTH_SUNDAY_GROUP))}
            label={t('rotation.signup.group_e_label', lang)}
            hint={t('rotation.signup.group_e_hint', lang)}
          />
        </div>
      </fieldset>

      <CheckRow
        checked={consent}
        disabled={pending}
        onChange={setConsent}
        label={t('rotation.signup.consent_label', lang)}
      />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn-primary w-full sm:w-auto"
        disabled={!canSubmit}
        onClick={submit}
      >
        {t('rotation.signup.submit', lang)}
      </button>
    </div>
  );
}
