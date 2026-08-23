'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage, AssignmentStatus } from '@/lib/types';
import { createAssignment } from './actions';

export type PastorOption = { id: string; full_name: string };

export function NewAssignmentForm({
  pastors,
  hasActive,
  lang,
}: {
  pastors: PastorOption[];
  hasActive: boolean;
  lang: AppLanguage;
}) {
  const router = useRouter();

  const defaultMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [pastor, setPastor] = useState<string>(pastors[0]?.id ?? '');
  const [month, setMonth] = useState(defaultMonth);
  const [status, setStatus] = useState<AssignmentStatus>('upcoming');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!pastor) {
      setError(t('assign.error.pastorRequired', lang));
      return;
    }
    const fd = new FormData();
    fd.set('pastor_user_id', pastor);
    fd.set('assignment_month', month);
    fd.set('status', status);
    startTransition(async () => {
      const res = await createAssignment(fd);
      if (!res.ok) {
        setError(errorMessage(res.error, lang));
        return;
      }
      setStatus('upcoming');
      router.refresh();
    });
  }

  if (pastors.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t('assign.form.noPastors', lang)}
      </p>
    );
  }

  const activeDisabled = hasActive && status !== 'active';

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor="assign-pastor">
          {t('assign.form.pastor', lang)}
        </label>
        <select
          id="assign-pastor"
          className="input"
          value={pastor}
          onChange={(e) => setPastor(e.target.value)}
        >
          {pastors.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="assign-month">
          {t('assign.form.month', lang)}
        </label>
        <input
          id="assign-month"
          className="input"
          type="month"
          required
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="assign-status">
          {t('assign.form.status', lang)}
        </label>
        <select
          id="assign-status"
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as AssignmentStatus)}
        >
          <option value="upcoming">{t('assign.status.upcoming', lang)}</option>
          <option value="active" disabled={hasActive}>
            {t('assign.status.active', lang)}
            {hasActive ? ` (${t('assign.form.activeTaken', lang)})` : ''}
          </option>
          <option value="completed">{t('assign.status.completed', lang)}</option>
        </select>
        {activeDisabled && (
          <p className="mt-1 text-xs text-muted">
            {t('assign.form.activeHint', lang)}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t('common.loading', lang) : t('assign.form.submit', lang)}
      </button>
    </form>
  );
}

function errorMessage(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'pastor_required':
      return t('assign.error.pastorRequired', lang);
    case 'invalid_month':
      return t('assign.error.invalidMonth', lang);
    case 'invalid_status':
      return t('assign.error.invalidStatus', lang);
    case 'active_exists':
      return t('assign.error.activeExists', lang);
    case 'duplicate':
      return t('assign.error.duplicate', lang);
    default:
      return code;
  }
}
