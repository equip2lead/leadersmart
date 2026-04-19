'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Child = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  allergies: string | null;
  photo_url: string | null;
  classroom_id: string | null;
  is_active: boolean;
};

type Classroom = { id: string; name: string };

export function ChildrenManager({
  churchId,
  children,
  classrooms,
}: {
  churchId: string;
  children: Child[];
  classrooms: Classroom[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return children;
    return children.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.parent_phone ?? '').includes(q) ||
        (c.parent_name ?? '').toLowerCase().includes(q),
    );
  }, [children, query]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: insErr } = await supabase.from('children').insert({
        church_id: churchId,
        full_name: fullName,
        date_of_birth: dob || null,
        parent_name: parentName || null,
        parent_phone: parentPhone || null,
        allergies: allergies || null,
        classroom_id: classroomId || null,
        is_active: true,
      });
      if (insErr) {
        setError(insErr.message);
        return;
      }
      setFullName('');
      setDob('');
      setParentName('');
      setParentPhone('');
      setAllergies('');
      setClassroomId('');
      setShowAdd(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search by child, parent or phone…"
            className="input pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showAdd ? 'Close' : 'Add child'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={onSubmit} className="card mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="kid-name">Child full name</label>
              <input
                id="kid-name"
                className="input"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="kid-dob">Date of birth</label>
              <input
                id="kid-dob"
                type="date"
                className="input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="kid-parent">Parent name</label>
              <input
                id="kid-parent"
                className="input"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="kid-phone">Parent WhatsApp</label>
              <input
                id="kid-phone"
                type="tel"
                className="input"
                placeholder="+237 6XX XX XX XX"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="kid-allergy">Allergies or medical notes</label>
              <input
                id="kid-allergy"
                className="input"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="kid-class">Classroom</label>
              <select
                id="kid-class"
                className="input"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '…' : 'Save child'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No children match your search.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Child</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Allergies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-sm font-medium text-ink">
                    {c.full_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    {c.parent_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    {c.parent_phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    {c.allergies ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
