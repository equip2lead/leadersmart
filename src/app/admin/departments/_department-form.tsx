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
};

export function DepartmentForm({
  mode,
  initial,
  leaders,
  lang,
  onDone,
}: {
  mode: 'create' | 'edit';
  initial: DepartmentFormInitial;
  leaders: LeaderOption[];
  lang: AppLanguage;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState<string>(initial.icon ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [leader, setLeader] = useState<string>(initial.leader_user_id ?? '__none__');
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
        setLeader('__none__');
      }
      router.refresh();
      onDone?.();
    });
  }

  const IconPreview = getDepartmentIcon(icon);

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-brand-50 text-brand-700">
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
          <option value="__none__">{t('dept.form.leaderNone', lang)}</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.full_name}
            </option>
          ))}
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
  return code;
}
