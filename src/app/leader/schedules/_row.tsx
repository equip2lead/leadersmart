'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import type { Slot } from './actions';
import { setSchedulePublished } from './actions';

export type ScheduleRow = {
  id: string;
  service_date: string;
  service_name: string;
  status: 'draft' | 'published';
  slots: Slot[];
  created_at: string;
  confirmed_count: number;
  slot_count: number;
};

export function ScheduleRowCard({
  schedule,
  memberNames,
  lang,
}: {
  schedule: ScheduleRow;
  memberNames: Record<string, string>;
  lang: AppLanguage;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function togglePublish() {
    setError(null);
    startTransition(async () => {
      const res = await setSchedulePublished(
        schedule.id,
        schedule.status !== 'published',
      );
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const dateLabel = new Date(schedule.service_date + 'T00:00:00Z').toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-US',
  );

  return (
    <li className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{schedule.service_name}</p>
          <p className="text-xs text-muted">{dateLabel}</p>
          <p className="mt-1 text-xs text-muted">
            {schedule.slots.length} {t('sched.slots', lang)} ·{' '}
            {schedule.confirmed_count}/{schedule.slot_count} {t('sched.confirmed', lang)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              schedule.status === 'published'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {schedule.status === 'published'
              ? t('sched.status.published', lang)
              : t('sched.status.draft', lang)}
          </span>
          <button
            type="button"
            onClick={togglePublish}
            disabled={pending}
            className="rounded-md px-2 py-1 text-xs font-medium text-body hover:bg-gray-50 disabled:opacity-50"
          >
            {schedule.status === 'published'
              ? t('sched.action.unpublish', lang)
              : t('sched.action.publish', lang)}
          </button>
        </div>
      </div>

      {schedule.slots.length > 0 && (
        <ul className="mt-3 space-y-1">
          {schedule.slots.map((s, i) => (
            <li key={i} className="flex items-center justify-between text-xs">
              <span className="text-body">{s.role || <em className="text-muted">{t('sched.slotNoRole', lang)}</em>}</span>
              <span className="text-muted">
                {s.team_member_id
                  ? (memberNames[s.team_member_id] ?? t('sched.slotUnknownMember', lang))
                  : t('sched.form.slotMemberNone', lang)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}
