'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function NewDepartmentForm({ churchId }: { churchId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from('departments').insert({
        church_id: churchId,
        name,
        icon: icon || null,
        description: description || null,
        is_active: true,
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setName('');
      setIcon('');
      setDescription('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label className="label" htmlFor="dept-name">
          Name
        </label>
        <input
          id="dept-name"
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="dept-icon">
          Icon (emoji)
        </label>
        <input
          id="dept-icon"
          className="input"
          maxLength={4}
          placeholder="👐"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="dept-desc">
          Description
        </label>
        <textarea
          id="dept-desc"
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? '…' : 'Add department'}
      </button>
    </form>
  );
}
