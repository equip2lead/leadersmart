'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { getDepartmentIcon } from '@/lib/icons';
import { DepartmentForm, type LeaderOption } from './_department-form';
import { setDepartmentActive } from './actions';

export type DepartmentRow = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  leader_user_id: string | null;
  leader_name: string | null;
  co_leader_1_user_id: string | null;
  co_leader_1_name: string | null;
  co_leader_2_user_id: string | null;
  co_leader_2_name: string | null;
  is_active: boolean;
};

export function DepartmentRowCard({
  dept,
  leaders,
  coLeaderCandidates,
  lang,
}: {
  dept: DepartmentRow;
  leaders: LeaderOption[];
  coLeaderCandidates: LeaderOption[];
  lang: AppLanguage;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const Icon = getDepartmentIcon(dept.icon);

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const res = await setDepartmentActive(dept.id, !dept.is_active);
      if (!res.ok) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  if (editing) {
    return (
      <li className="card">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">{t('dept.editing', lang)}</p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-muted hover:text-ink"
            aria-label={t('common.cancel', lang)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <DepartmentForm
          mode="edit"
          initial={{
            id: dept.id,
            name: dept.name,
            icon: dept.icon,
            description: dept.description,
            leader_user_id: dept.leader_user_id,
            co_leader_1_user_id: dept.co_leader_1_user_id,
            co_leader_2_user_id: dept.co_leader_2_user_id,
          }}
          leaders={leaders}
          coLeaderCandidates={coLeaderCandidates}
          lang={lang}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  const coHeads = [dept.co_leader_1_name, dept.co_leader_2_name].filter(
    (n): n is string => !!n,
  );

  return (
    <li className="card flex items-start gap-4">
      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-royal-50 text-indigo-royal-700">
        {Icon ? (
          <Icon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <span className="text-sm font-semibold">{dept.name.slice(0, 1)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{dept.name}</p>
        {dept.description && (
          <p className="truncate text-xs text-muted">{dept.description}</p>
        )}
        <p className="mt-1 text-xs text-muted">
          {t('dept.leaderLabel', lang)}:{' '}
          <span className="text-body">
            {dept.leader_name ?? t('dept.leaderUnassigned', lang)}
          </span>
        </p>
        {coHeads.length > 0 && (
          <p className="mt-0.5 text-xs text-muted">
            {t('dept.coLeadersLabel', lang)}:{' '}
            <span className="text-body">{coHeads.join(', ')}</span>
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            dept.is_active
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {dept.is_active ? t('dept.statusActive', lang) : t('dept.statusInactive', lang)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-royal-700 hover:bg-indigo-royal-50"
          >
            <Pencil className="h-3 w-3" />
            {t('common.edit', lang)}
          </button>
          <button
            type="button"
            onClick={toggleActive}
            disabled={pending}
            className="rounded-md px-2 py-1 text-xs font-medium text-body hover:bg-gray-50 disabled:opacity-50"
          >
            {dept.is_active ? t('dept.deactivate', lang) : t('dept.reactivate', lang)}
          </button>
        </div>
      </div>
    </li>
  );
}
