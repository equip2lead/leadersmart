'use client';

import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

export type DepartmentOption = { id: string; name: string };

// Shared department filter for /admin/schedules, /admin/attendance,
// /admin/weekly-reports. Changing the selection navigates to the same
// pathname with ?dept=<id>; clearing goes back to no filter.
export function DepartmentPicker({
  basePath,
  selectedId,
  options,
  lang,
}: {
  basePath: string;
  selectedId: string;
  options: DepartmentOption[];
  lang: AppLanguage;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
      <div className="min-w-0 flex-1">
        <label className="label" htmlFor="admin-dept-picker">
          {t('adminAggregate.filter.department', lang)}
        </label>
        <select
          id="admin-dept-picker"
          className="input"
          value={selectedId}
          onChange={(e) => {
            const v = e.target.value;
            router.push(v ? `${basePath}?dept=${v}` : basePath);
          }}
        >
          <option value="">{t('adminAggregate.filter.allDepartments', lang)}</option>
          {options.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {selectedId && (
        <button type="button" onClick={() => router.push(basePath)} className="btn-secondary">
          {t('adminAggregate.filter.clear', lang)}
        </button>
      )}
    </div>
  );
}
