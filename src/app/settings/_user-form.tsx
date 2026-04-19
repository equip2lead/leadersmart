'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AppLanguage } from '@/lib/types';

type Initial = {
  full_name: string;
  phone: string;
  preferred_language: AppLanguage;
  email: string;
};

export function UserProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [language, setLanguage] = useState<AppLanguage>(initial.preferred_language);
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
        .from('users')
        .update({
          full_name: fullName,
          phone: phone || null,
          preferred_language: language,
        })
        .eq('id', userId);

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
        <label className="label" htmlFor="u-email">Email</label>
        <input
          id="u-email"
          className="input"
          value={initial.email}
          readOnly
          disabled
        />
        <p className="mt-1 text-xs text-muted">
          Email changes are handled by support in v1.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="u-name">Full name</label>
        <input
          id="u-name"
          className="input"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="u-phone">WhatsApp phone</label>
        <input
          id="u-phone"
          type="tel"
          className="input"
          placeholder="+237 6XX XX XX XX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="u-lang">Preferred language</label>
        <select
          id="u-lang"
          className="input"
          value={language}
          onChange={(e) => setLanguage(e.target.value as AppLanguage)}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
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
        {saving ? '…' : 'Save profile'}
      </button>
    </form>
  );
}
