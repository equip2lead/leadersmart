'use client';

import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

export type ScheduleOption = { id: string; label: string };

export function SchedulePicker({
  selectedId,
  options,
  lang,
}: {
  selectedId: string;
  options: ScheduleOption[];
  lang: AppLanguage;
}) {
  const router = useRouter();
  return (
    <div>
      <label className="label" htmlFor="att-sched">
        {t('att.pickSchedule', lang)}
      </label>
      <select
        id="att-sched"
        defaultValue={selectedId}
        className="input max-w-md"
        onChange={(e) => router.push(`/leader/attendance?schedule=${e.target.value}`)}
      >
        {options.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
