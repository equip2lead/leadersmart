'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AppLanguage } from '@/lib/types';

type Initial = {
  name: string;
  country: string;
  city: string;
  language: AppLanguage;
  timezone: string;
  currency: string;
};

export function ChurchProfileForm({
  churchId,
  initial,
}: {
  churchId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [country, setCountry] = useState(initial.country);
  const [city, setCity] = useState(initial.city);
  const [language, setLanguage] = useState<AppLanguage>(initial.language);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [currency, setCurrency] = useState(initial.currency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updErr } = await supabase
        .from('churches')
        .update({
          name,
          country: country || null,
          city: city || null,
          language,
          timezone,
          currency,
        })
        .eq('id', churchId);

      if (updErr) {
        setError(updErr.message);
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label className="label" htmlFor="ch-name">Name</label>
        <input
          id="ch-name"
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ch-country">Country</label>
          <input
            id="ch-country"
            className="input"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="ch-city">City</label>
          <input
            id="ch-city"
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="ch-lang">Language</label>
          <select
            id="ch-lang"
            className="input"
            value={language}
            onChange={(e) => setLanguage(e.target.value as AppLanguage)}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ch-tz">Timezone</label>
          <input
            id="ch-tz"
            className="input"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="ch-ccy">Currency</label>
          <input
            id="ch-ccy"
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          Saved.
        </p>
      )}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? '…' : 'Save church profile'}
      </button>
    </form>
  );
}
