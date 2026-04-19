'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { PlanTask } from './page';
import type { TaskCategory } from '@/lib/types';

const WEEKS = [1, 2, 3, 4, 5] as const;

const CATEGORIES: Array<{ value: TaskCategory; label: string }> = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'senior_leadership', label: 'Senior Leadership' },
  { value: 'department_oversight', label: 'Department Oversight' },
  { value: 'spiritual_followup', label: 'Spiritual Follow-Up' },
  { value: 'communication', label: 'Communication' },
  { value: 'service_organization', label: 'Service Organization' },
  { value: 'evangelism', label: 'Evangelism' },
  { value: 'report_clarity', label: 'Report Clarity' },
];

export function WeeklyPlanBoard({
  assignmentId,
  initial,
}: {
  assignmentId: string;
  initial: PlanTask[];
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(initial);
  const [newTaskText, setNewTaskText] = useState<Record<number, string>>({});
  const [newTaskCat, setNewTaskCat] = useState<Record<number, TaskCategory>>({});
  const [error, setError] = useState<string | null>(null);

  async function addTask(week: number) {
    const text = (newTaskText[week] ?? '').trim();
    const category = newTaskCat[week] ?? 'leadership';
    if (!text) return;

    const supabase = createClient();
    const displayOrder = tasks.filter((t) => t.week_number === week).length;
    const { data, error: insErr } = await supabase
      .from('weekly_execution_tasks')
      .insert({
        pastor_assignment_id: assignmentId,
        week_number: week,
        task_text: text,
        category,
        display_order: displayOrder,
        is_complete: false,
      })
      .select('id, week_number, task_text, is_complete, category, display_order')
      .single();

    if (insErr || !data) {
      setError(insErr?.message ?? 'Insert failed');
      return;
    }
    setTasks((prev) => [...prev, data as PlanTask]);
    setNewTaskText((prev) => ({ ...prev, [week]: '' }));
  }

  async function toggle(task: PlanTask) {
    const nextDone = !task.is_complete;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, is_complete: nextDone } : t,
      ),
    );
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from('weekly_execution_tasks')
      .update({
        is_complete: nextDone,
        completed_at: nextDone ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
    if (updErr) {
      setError(updErr.message);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, is_complete: !nextDone } : t,
        ),
      );
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {WEEKS.map((week) => {
        const weekTasks = tasks.filter((t) => t.week_number === week);
        const done = weekTasks.filter((t) => t.is_complete).length;
        return (
          <div key={week} className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">Week {week}</h3>
              <span className="text-xs text-muted">
                {done}/{weekTasks.length} done
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {weekTasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => void toggle(task)}
                    className="flex w-full items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5 text-left text-sm transition hover:bg-gray-50"
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
                <li className="text-xs text-muted">No tasks yet for this week.</li>
              )}
            </ul>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Add a task…"
                className="input flex-1"
                value={newTaskText[week] ?? ''}
                onChange={(e) =>
                  setNewTaskText((prev) => ({ ...prev, [week]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void addTask(week);
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
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void addTask(week)}
                className="btn-primary sm:w-auto"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
