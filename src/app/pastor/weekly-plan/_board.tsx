'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, TaskCategory } from '@/lib/types';
import type { PlanTask } from './page';
import { addWeeklyTask, toggleWeeklyTask } from './actions';

const WEEKS = [1, 2, 3, 4, 5] as const;

const CATEGORIES: Array<{ value: TaskCategory; labelKey: string }> = [
  { value: 'leadership', labelKey: 'plan.cat.leadership' },
  { value: 'senior_leadership', labelKey: 'plan.cat.senior_leadership' },
  { value: 'department_oversight', labelKey: 'plan.cat.department_oversight' },
  { value: 'spiritual_followup', labelKey: 'plan.cat.spiritual_followup' },
  { value: 'communication', labelKey: 'plan.cat.communication' },
  { value: 'service_organization', labelKey: 'plan.cat.service_organization' },
  { value: 'evangelism', labelKey: 'plan.cat.evangelism' },
  { value: 'report_clarity', labelKey: 'plan.cat.report_clarity' },
];

export function WeeklyPlanBoard({
  assignmentId,
  initial,
  lang,
}: {
  assignmentId: string;
  initial: PlanTask[];
  lang: AppLanguage;
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(initial);
  const [newTaskText, setNewTaskText] = useState<Record<number, string>>({});
  const [newTaskCat, setNewTaskCat] = useState<Record<number, TaskCategory>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addTask(week: number) {
    const text = (newTaskText[week] ?? '').trim();
    const category = newTaskCat[week] ?? 'leadership';
    if (!text) return;
    setError(null);
    startTransition(async () => {
      const res = await addWeeklyTask(assignmentId, week, text, category);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTasks((prev) => [...prev, res.task]);
      setNewTaskText((prev) => ({ ...prev, [week]: '' }));
    });
  }

  function toggle(task: PlanTask) {
    const nextDone = !task.is_complete;
    setTasks((prev) =>
      prev.map((tk) => (tk.id === task.id ? { ...tk, is_complete: nextDone } : tk)),
    );
    startTransition(async () => {
      const res = await toggleWeeklyTask(task.id);
      if (!res.ok) {
        setError(res.error);
        setTasks((prev) =>
          prev.map((tk) =>
            tk.id === task.id ? { ...tk, is_complete: !nextDone } : tk,
          ),
        );
      }
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {WEEKS.map((week) => {
        const weekTasks = tasks.filter((tk) => tk.week_number === week);
        const done = weekTasks.filter((tk) => tk.is_complete).length;
        return (
          <div key={week} className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">
                {t('pastor.week', lang)} {week}
              </h3>
              <span className="text-xs text-muted">
                {done}/{weekTasks.length} {t('plan.done', lang)}
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {weekTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggle(task)}
                    disabled={pending}
                    className="flex w-full items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5 text-left text-sm transition hover:bg-gray-50 disabled:opacity-70"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        task.is_complete
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {task.is_complete && '✓'}
                    </span>
                    <span
                      className={
                        task.is_complete ? 'text-muted line-through' : 'text-body'
                      }
                    >
                      {task.task_text}
                    </span>
                  </button>
                </li>
              ))}
              {weekTasks.length === 0 && (
                <li className="text-xs text-muted">{t('pastor.week.empty', lang)}</li>
              )}
            </ul>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder={t('plan.addPlaceholder', lang)}
                className="input flex-1"
                value={newTaskText[week] ?? ''}
                onChange={(e) =>
                  setNewTaskText((prev) => ({ ...prev, [week]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTask(week);
                  }
                }}
              />
              <select
                className="input sm:w-52"
                value={newTaskCat[week] ?? 'leadership'}
                onChange={(e) =>
                  setNewTaskCat((prev) => ({
                    ...prev,
                    [week]: e.target.value as TaskCategory,
                  }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.labelKey, lang)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => addTask(week)}
                disabled={pending}
                className="btn-primary sm:w-auto"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('common.add', lang)}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
