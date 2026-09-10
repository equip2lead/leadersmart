'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { planYearFifthSundays } from '../actions';

export type PlannedFifthSunday = {
  monthLabel: string;
  date: string;
  dateLabel: string;
  saved: boolean;
};

export function YearPlanner({
  lang,
  year,
  years,
  rows,
}: {
  lang: AppLanguage;
  year: number;
  years: number[];
  rows: PlannedFifthSunday[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await planYearFifthSundays(year);
      if (!res.ok) {
        const key = `rotation.admin.err.${res.error}`;
        const translated = t(key, lang);
        setError(translated === key ? res.error : translated);
        return;
      }
      setMessage(
        t('rotation.admin.plan_year.toast_saved', lang)
          .replace('{count}', String(res.count))
          .replace('{year}', String(year)),
      );
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{t('rotation.admin.plan_year.year_selector', lang)}</p>
          {/* Links, not a select: the year is a server-side query, so it
              belongs in the URL where it can be shared and reloaded. */}
          <div className="flex gap-1">
            {years.map((y) => (
              <Link
                key={y}
                href={`/admin/rotation/plan-year?year=${y}`}
                aria-current={y === year ? 'page' : undefined}
                className={
                  'rounded-lg border px-3 py-2 text-sm font-semibold transition ' +
                  (y === year
                    ? 'border-indigo-royal-700 bg-indigo-royal-50 text-indigo-royal-700'
                    : 'border-gray-200 bg-white text-muted hover:text-ink')
                }
              >
                {y}
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={pending || rows.length === 0}
          onClick={save}
        >
          <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          {t('rotation.admin.plan_year.save_button', lang)}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-body">
          {t('rotation.admin.plan_year.none', lang).replace('{year}', String(year))}
        </p>
      ) : (
        <>
          <p className="mt-5 text-xs text-muted">
            {t('rotation.admin.plan_year.count_note', lang).replace(
              '{count}',
              String(rows.length),
            )}
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {t('rotation.admin.plan_year.month_column', lang)}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t('rotation.admin.plan_year.date_column', lang)}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t('rotation.admin.plan_year.status_column', lang)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.date}>
                    <td className="px-4 py-3 font-medium text-ink">{r.monthLabel}</td>
                    <td className="px-4 py-3 text-body">{r.dateLabel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'rounded-full border px-2.5 py-1 text-xs font-semibold ' +
                          (r.saved
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-white text-muted')
                        }
                      >
                        {t(
                          r.saved
                            ? 'rotation.admin.plan_year.status_saved'
                            : 'rotation.admin.plan_year.status_not_saved',
                          lang,
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
