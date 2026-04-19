'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Flame, X, Search, Printer, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Child } from './types';

type Classroom = { id: string; name: string };

type Checkin = {
  id: string;
  child_id: string;
  pickup_code: string;
};

function generatePickupCode(): string {
  // 4 uppercase letters + digits, e.g. "KF7Q"
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i += 1) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

export function KioskScreen({
  churchId,
  churchName,
  operatorName,
}: {
  churchId: string;
  churchName: string;
  operatorName: string;
}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [completedCheckins, setCompletedCheckins] = useState<
    Array<Checkin & { child: Child }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCompletedCheckins([]);
    setSelected(new Set());
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: kidsErr } = await supabase
        .from('children')
        .select(
          'id, full_name, date_of_birth, parent_name, parent_phone, allergies, photo_url, classroom_id, is_active',
        )
        .eq('church_id', churchId)
        .eq('is_active', true)
        .ilike('parent_phone', `%${phone.replace(/\s+/g, '')}%`);

      if (kidsErr) {
        setError(kidsErr.message);
        return;
      }

      const { data: classData } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('church_id', churchId);

      setChildren((data as Child[]) ?? []);
      setClassrooms((classData as Classroom[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function checkIn() {
    if (selected.size === 0 || !children) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const selectedChildren = children.filter((c) => selected.has(c.id));

      const rows = selectedChildren.map((c) => ({
        church_id: churchId,
        child_id: c.id,
        service_date: today,
        pickup_code: generatePickupCode(),
        status: 'active' as const,
      }));

      const { data, error: insErr } = await supabase
        .from('checkins')
        .insert(rows)
        .select('id, child_id, pickup_code');

      if (insErr || !data) {
        setError(insErr?.message ?? 'Check-in failed');
        return;
      }

      // Queue WhatsApp confirmations (Twilio integration deferred — v1 logs only).
      const parentPhones = Array.from(
        new Set(selectedChildren.map((c) => c.parent_phone).filter(Boolean)),
      );
      if (parentPhones.length > 0) {
        const messages = parentPhones.map((phoneNumber) => ({
          church_id: churchId,
          direction: 'outbound' as const,
          status: 'queued' as const,
          to_phone: phoneNumber,
          body: `Your child has been checked in at ${churchName}. Pickup codes sent separately.`,
        }));
        await supabase.from('whatsapp_messages').insert(messages);
      }

      const result = data.map((d) => ({
        ...d,
        child: selectedChildren.find((c) => c.id === d.child_id)!,
      }));
      setCompletedCheckins(result);
    } finally {
      setLoading(false);
    }
  }

  function printLabels() {
    if (typeof window === 'undefined') return;
    window.print();
  }

  function reset() {
    setPhone('');
    setChildren(null);
    setSelected(new Set());
    setCompletedCheckins([]);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 print:bg-white">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 print:hidden">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-flame-600" aria-hidden="true" />
          <span className="text-lg font-bold text-ink">
            {churchName} · Kiosk
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">Operator: {operatorName}</span>
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-body hover:bg-gray-50"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Exit kiosk
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8 print:max-w-none print:py-0">
        {completedCheckins.length > 0 ? (
          <div>
            <div className="print:hidden">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-7 w-7 text-emerald-500" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-ink">Checked in!</h1>
              </div>
              <p className="mt-2 text-body">
                {completedCheckins.length} child
                {completedCheckins.length > 1 ? 'ren' : ''} checked in. Print labels or start another check-in.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={printLabels}
                  className="btn-primary"
                >
                  <Printer className="h-4 w-4" aria-hidden="true" /> Print labels
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="btn-secondary"
                >
                  Start new check-in
                </button>
              </div>
            </div>

            <div ref={printRef} className="mt-8 space-y-4 print:mt-0">
              {completedCheckins.map((c) => {
                const classroom = classrooms.find(
                  (r) => r.id === c.child.classroom_id,
                );
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border-2 border-gray-900 bg-white p-6 print:break-after-page"
                  >
                    <p className="text-xs uppercase tracking-widest text-muted">
                      {churchName}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-ink">
                      {c.child.full_name}
                    </p>
                    {classroom && (
                      <p className="mt-1 text-sm text-body">
                        Room: {classroom.name}
                      </p>
                    )}
                    {c.child.allergies && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                        ⚠ Allergies: {c.child.allergies}
                      </p>
                    )}
                    <div className="mt-6 flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted">
                          Pickup code
                        </p>
                        <p className="mt-1 text-4xl font-black tracking-widest text-ink">
                          {c.pickup_code}
                        </p>
                      </div>
                      <p className="text-xs text-muted">
                        {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-ink">Check in a family</h1>
            <p className="mt-2 text-body">
              Search by parent WhatsApp number.
            </p>

            <form onSubmit={search} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="tel"
                  autoFocus
                  required
                  placeholder="Parent phone, e.g. +237 6XX XX XX XX"
                  className="input !h-14 pl-12 !text-lg"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary !h-14 !px-8 !text-base"
              >
                {loading ? 'Searching…' : 'Find family'}
              </button>
            </form>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {children !== null && children.length === 0 && (
              <p className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center text-sm text-muted">
                No children found for this phone number. Add them from Kids Management first.
              </p>
            )}

            {children !== null && children.length > 0 && (
              <div className="mt-8">
                <p className="text-sm font-semibold text-ink">
                  Tap each child to select:
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {children.map((c) => {
                    const picked = selected.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggle(c.id)}
                        className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                          picked
                            ? 'border-brand-700 bg-brand-50'
                            : 'border-gray-100 bg-white hover:border-brand-300'
                        }`}
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-flame-100 text-flame-700 text-xl font-bold">
                          {c.full_name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{c.full_name}</p>
                          {c.allergies && (
                            <p className="text-xs text-red-700">⚠ {c.allergies}</p>
                          )}
                        </div>
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                            picked
                              ? 'bg-brand-700 text-white'
                              : 'border border-gray-300 bg-white'
                          }`}
                        >
                          {picked ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => void checkIn()}
                  disabled={selected.size === 0 || loading}
                  className="btn-primary mt-6 w-full !h-14 !text-base"
                >
                  {loading
                    ? 'Checking in…'
                    : `Check in ${selected.size} child${selected.size === 1 ? '' : 'ren'}`}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-gray-100 bg-white px-4 py-3 text-center text-xs text-muted print:hidden">
        LeaderSmart · Authenticated kiosk mode
      </footer>
    </div>
  );
}
