'use client';

import { useOptimistic, useTransition, startTransition } from 'react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { markAttendance } from './actions';

export type AttendanceMember = {
  id: string;
  full_name: string;
  showed_up: boolean | null;
};

export function AttendanceList({
  scheduleId,
  members,
  lang,
}: {
  scheduleId: string;
  members: AttendanceMember[];
  lang: AppLanguage;
}) {
  const [optimistic, applyOptimistic] = useOptimistic(
    members,
    (state: AttendanceMember[], patch: { id: string; showed_up: boolean }) =>
      state.map((m) => (m.id === patch.id ? { ...m, showed_up: patch.showed_up } : m)),
  );
  const [pending] = useTransition();

  function toggle(m: AttendanceMember) {
    const next = !(m.showed_up === true);
    startTransition(async () => {
      applyOptimistic({ id: m.id, showed_up: next });
      const res = await markAttendance(scheduleId, m.id, next);
      if (!res.ok) {
        // The next server render (router.refresh via revalidatePath) will reconcile.
      }
    });
  }

  const presentCount = optimistic.filter((m) => m.showed_up === true).length;

  if (members.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-muted">
        {t('att.emptyMembers', lang)}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="card">
        <p className="text-sm text-body">
          {t('att.presentCount', lang)}:{' '}
          <strong className="text-ink">{presentCount}</strong> / {members.length}
        </p>
      </div>

      <ul className="space-y-2">
        {optimistic.map((m) => {
          const isPresent = m.showed_up === true;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => toggle(m)}
                disabled={pending}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                  isPresent
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                } disabled:opacity-70`}
              >
                <span className="font-medium text-ink">{m.full_name}</span>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    isPresent ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-muted'
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
