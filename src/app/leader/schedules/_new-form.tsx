'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { createSchedule, type Slot } from './actions';

export type MemberOption = { id: string; full_name: string };

// Next Sunday as YYYY-MM-DD (UTC-anchored to avoid TZ off-by-ones).
function nextSunday(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const daysUntilSunday = (7 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  return d.toISOString().slice(0, 10);
}

export function NewScheduleForm({
  departmentId,
  members,
  lang,
}: {
  departmentId: string;
  members: MemberOption[];
  lang: AppLanguage;
}) {
  const router = useRouter();
  const [serviceDate, setServiceDate] = useState<string>(nextSunday());
  const [serviceName, setServiceName] = useState<string>(t('sched.form.defaultName', lang));
  const [slots, setSlots] = useState<Slot[]>([{ role: '', team_member_id: null }]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.full_name })),
    [members],
  );

  function updateSlot(idx: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function addSlot() {
    setSlots((prev) => [...prev, { role: '', team_member_id: null }]);
  }
  function removeSlot(idx: number) {
    setSlots((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function submit(publish: boolean, e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createSchedule(departmentId, {
        serviceDate,
        serviceName,
        slots,
        publish,
        notes: notes.trim() || null,
      });
      if (!res.ok) {
        setError(errorMessage(res.error, lang));
        return;
      }
      setSlots([{ role: '', team_member_id: null }]);
      setNotes('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={(e) => submit(false, e)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sched-date">
            {t('sched.form.date', lang)}
          </label>
          <input
            id="sched-date"
            className="input"
            type="date"
            required
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="sched-name">
            {t('sched.form.name', lang)}
          </label>
          <input
            id="sched-name"
            className="input"
            required
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <p className="label">{t('sched.form.slots', lang)}</p>
        <ul className="mt-2 space-y-2">
          {slots.map((s, i) => (
            <li key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="input sm:flex-1"
                placeholder={t('sched.form.slotRolePlaceholder', lang)}
                value={s.role}
                onChange={(e) => updateSlot(i, { role: e.target.value })}
              />
              <select
                className="input sm:flex-1"
                value={s.team_member_id ?? ''}
                onChange={(e) =>
                  updateSlot(i, { team_member_id: e.target.value || null })
                }
              >
                <option value="">{t('sched.form.slotMemberNone', lang)}</option>
                {memberOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="rounded-md p-2 text-muted hover:bg-gray-50 hover:text-red-600"
                aria-label={t('common.delete', lang)}
                disabled={slots.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addSlot}
          className="mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
        >
          <Plus className="h-3 w-3" />
          {t('sched.form.addSlot', lang)}
        </button>
      </div>

      <div>
        <label className="label" htmlFor="sched-notes">
          {t('sched.form.notes', lang)}
        </label>
        <textarea
          id="sched-notes"
          rows={2}
          className="input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending}
          className="btn-secondary"
        >
          {t('sched.form.saveDraft', lang)}
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={pending}
          className="btn-primary"
        >
          {t('sched.form.publish', lang)}
        </button>
      </div>
    </form>
  );
}

function errorMessage(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'name_required':
      return t('sched.error.nameRequired', lang);
    case 'invalid_date':
      return t('sched.error.invalidDate', lang);
    case 'unauthorized':
      return t('team.error.unauthorized', lang);
    default:
      return code;
  }
}
