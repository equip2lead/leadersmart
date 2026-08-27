'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { DEPARTMENT_ICON_NAMES, getDepartmentIcon } from '@/lib/icons';
import { createDepartment, updateDepartment } from './actions';

export type LeaderOption = { id: string; full_name: string };

export type DepartmentFormInitial = {
  id?: string;
  name: string;
  icon: string | null;
  description: string | null;
  leader_user_id: string | null;
  co_leader_1_user_id: string | null;
  co_leader_2_user_id: string | null;
};

const NONE = '__none__';

export function DepartmentForm({
  mode,
  initial,
  leaders,
  coLeaderCandidates,
  lang,
  onDone,
}: {
  mode: 'create' | 'edit';
  initial: DepartmentFormInitial;
  // All active users in the church — head can be any of them.
  leaders: LeaderOption[];
  // Restricted pool for co-heads: admin_pastor + department_head (+ legacy
  // pastor / department_leader). Passed separately so we don't duplicate
  // the filter logic across pages.
  coLeaderCandidates: LeaderOption[];
  lang: AppLanguage;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState<string>(initial.icon ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [leader, setLeader] = useState<string>(initial.leader_user_id ?? NONE);
  const [co1, setCo1] = useState<string>(initial.co_leader_1_user_id ?? NONE);
  const [co2, setCo2] = useState<string>(initial.co_leader_2_user_id ?? NONE);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('name', name);
    fd.set('icon', icon);
    fd.set('description', description);
    fd.set('leader_user_id', leader);
    fd.set('co_leader_1_user_id', co1);
    fd.set('co_leader_2_user_id', co2);

    startTransition(async () => {
      const res =
        mode === 'edit' && initial.id
          ? await updateDepartment(initial.id, fd)
          : await createDepartment(fd);

      if (!res.ok) {
        setError(errorMessage(res.error, lang));
        return;
      }
      if (mode === 'create') {
        setName('');
        setIcon('');
        setDescription('');
        setLeader(NONE);
        setCo1(NONE);
        setCo2(NONE);
      }
      router.refresh();
      onDone?.();
    });
  }

  const IconPreview = getDepartmentIcon(icon);
  // Prevent picking the same person twice: filter each co-head dropdown
  // to exclude anyone already selected in another slot.
  const takenBy = (self: string) =>
    new Set(
      [leader, co1, co2].filter((v) => v !== NONE && v !== self),
    );

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label className="label" htmlFor={`dept-name-${mode}`}>
          {t('dept.form.name', lang)}
        </label>
        <input
          id={`dept-name-${mode}`}
          className="input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor={`dept-icon-${mode}`}>
          {t('dept.form.icon', lang)}
        </label>
        <div className="flex items-center gap-3">
          <select
            id={`dept-icon-${mode}`}
            className="input flex-1"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          >
            <option value="">{t('dept.form.iconNone', lang)}</option>
            {DEPARTMENT_ICON_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-indigo-royal-50 text-indigo-royal-700">
            {IconPreview ? <IconPreview className="h-5 w-5" aria-hidden="true" /> : '—'}
          </div>
        </div>
      </div>

      <div>
        <label className="label" htmlFor={`dept-desc-${mode}`}>
          {t('dept.form.description', lang)}
        </label>
        <textarea
          id={`dept-desc-${mode}`}
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor={`dept-leader-${mode}`}>
          {t('dept.form.leader', lang)}
        </label>
        <select
          id={`dept-leader-${mode}`}
          className="input"
          value={leader}
          onChange={(e) => setLeader(e.target.value)}
        >
          <option value={NONE}>{t('dept.form.leaderNone', lang)}</option>
          {leaders.map((l) => {
            const taken = takenBy(leader).has(l.id);
            return (
              <option key={l.id} value={l.id} disabled={taken}>
                {l.full_name}
                {taken ? ` (${t('dept.form.alreadyAssigned', lang)})` : ''}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="label" htmlFor={`dept-co1-${mode}`}>
          {t('dept.form.coLeader1', lang)}
        </label>
        <select
          id={`dept-co1-${mode}`}
          className="input"
          value={co1}
          onChange={(e) => setCo1(e.target.value)}
        >
          <option value={NONE}>{t('dept.form.coLeaderNone', lang)}</option>
          {coLeaderCandidates.map((l) => {
            const taken = takenBy(co1).has(l.id);
            return (
              <option key={l.id} value={l.id} disabled={taken}>
                {l.full_name}
                {taken ? ` (${t('dept.form.alreadyAssigned', lang)})` : ''}
              </option>
            );
          })}
        </select>
        <p className="mt-1 text-xs text-muted">
          {t('dept.form.coLeaderHint', lang)}
        </p>
      </div>

      <div>
        <label className="label" htmlFor={`dept-co2-${mode}`}>
          {t('dept.form.coLeader2', lang)}
        </label>
        <select
          id={`dept-co2-${mode}`}
          className="input"
          value={co2}
          onChange={(e) => setCo2(e.target.value)}
        >
          <option value={NONE}>{t('dept.form.coLeaderNone', lang)}</option>
          {coLeaderCandidates.map((l) => {
            const taken = takenBy(co2).has(l.id);
            return (
              <option key={l.id} value={l.id} disabled={taken}>
                {l.full_name}
                {taken ? ` (${t('dept.form.alreadyAssigned', lang)})` : ''}
              </option>
            );
          })}
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending
          ? t('common.loading', lang)
          : mode === 'edit'
            ? t('common.save', lang)
            : t('dept.form.submitCreate', lang)}
      </button>
    </form>
  );
}

function errorMessage(code: string, lang: AppLanguage): string {
  if (code === 'name_required') return t('dept.error.nameRequired', lang);
  if (code === 'not_found') return t('dept.error.notFound', lang);
  if (code === 'duplicate_assignments') return t('dept.error.duplicateAssignments', lang);
  return code;
}
