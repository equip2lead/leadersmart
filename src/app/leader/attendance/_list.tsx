'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Member = { id: string; full_name: string };

export function AttendanceList({
  departmentId,
  serviceDate,
  members,
  initial,
}: {
  departmentId: string;
  serviceDate: string;
  members: Member[];
  initial: Record<string, boolean>;
}) {
  const [present, setPresent] = useState<Record<string, boolean>>(initial);
  const [error, setError] = useState<string | null>(null);

  async function toggle(memberId: string) {
    const next = !present[memberId];
    setPresent((p) => ({ ...p, [memberId]: next }));

    const supabase = createClient();
    const { error: upsertErr } = await supabase
      .from('team_attendance')
      .upsert(
        {
          department_id: departmentId,
          team_member_id: memberId,
          service_date: serviceDate,
          is_present: next,
        },
        { onConflict: 'department_id,team_member_id,service_date' },
      );

    if (upsertErr) {
      setError(upsertErr.message);
      setPresent((p) => ({ ...p, [memberId]: !next }));
    }
  }

  const presentCount = Object.values(present).filter(Boolean).length;

  if (members.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
        Add team members first to track attendance.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="card">
        <p className="text-sm text-body">
          Present: <strong className="text-ink">{presentCount}</strong> / {members.length}
        </p>
      </div>

      <ul className="space-y-2">
        {members.map((m) => {
          const isPresent = !!present[m.id];
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => void toggle(m.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                  isPresent
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="font-medium text-ink">{m.full_name}</span>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    isPresent
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-muted'
                  }`}
                >
                  {isPresent ? '✓' : '—'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
