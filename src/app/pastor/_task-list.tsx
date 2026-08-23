'use client';

import { useOptimistic, useTransition, startTransition } from 'react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { togglePastorTask } from './actions';

export type DashboardTask = {
  id: string;
  week_number: number;
  task_text: string;
  is_complete: boolean;
};

const WEEKS = [1, 2, 3, 4, 5] as const;

export function WeeklyTaskList({
  tasks,
  currentWeek,
  lang,
}: {
  tasks: DashboardTask[];
  currentWeek: number;
  lang: AppLanguage;
}) {
  const [optimistic, applyOptimistic] = useOptimistic(
    tasks,
    (state: DashboardTask[], id: string) =>
      state.map((t) => (t.id === id ? { ...t, is_complete: !t.is_complete } : t)),
  );
  const [pending] = useTransition();

  function toggle(id: string) {
    startTransition(async () => {
      applyOptimistic(id);
      const res = await togglePastorTask(id);
      if (!res.ok) {
        // Optimistic state is reset by the next server render on router.refresh().
      }
    });
  }

  return (
    <div className="space-y-4">
      {WEEKS.map((week) => {
        const weekTasks = optimistic.filter((tk) => tk.week_number === week);
        const done = weekTasks.filter((tk) => tk.is_complete).length;
        const isCurrent = week === currentWeek;
        return (
          <div
            key={week}
            className={`rounded-xl border ${
              isCurrent ? 'border-brand-200 bg-brand-50/40' : 'border-gray-100 bg-white'
            } p-4`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {t('pastor.week', lang)} {week}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-medium uppercase text-white">
                    {t('pastor.currentWeekBadge', lang)}
                  </span>
                )}
              </p>
              <span className="text-xs text-muted">
                {done}/{weekTasks.length}
              </span>
            </div>
            {weekTasks.length === 0 ? (
              <p className="mt-3 text-xs text-muted">{t('pastor.week.empty', lang)}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {weekTasks.map((tk) => (
                  <li key={tk.id}>
                    <button
                      type="button"
                      onClick={() => toggle(tk.id)}
                      disabled={pending}
                      className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white disabled:opacity-70"
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          tk.is_complete
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {tk.is_complete && '✓'}
                      </span>
                      <span
                        className={
                          tk.is_complete ? 'text-muted line-through' : 'text-body'
                        }
                      >
                        {tk.task_text}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
