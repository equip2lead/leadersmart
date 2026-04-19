'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NewTeamMemberForm({ departmentId }: { departmentId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from('team_members').insert({
        department_id: departmentId,
        full_name: name,
        phone,
        role_in_team: role || null,
        joined_date: new Date().toISOString().slice(0, 10),
        is_active: true,
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setName('');
      setPhone('');
      setRole('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label className="label" htmlFor="tm-name">Full name</label>
        <input
          id="tm-name"
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="tm-phone">WhatsApp phone</label>
        <input
          id="tm-phone"
          className="input"
          type="tel"
          required
          placeholder="+237 6XX XX XX XX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="tm-role">Role in team</label>
        <input
          id="tm-role"
          className="input"
          placeholder="e.g. Sound engineer"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? '…' : 'Add team member'}
      </button>
    </form>
  );
}
