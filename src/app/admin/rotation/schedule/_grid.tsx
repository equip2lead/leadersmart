'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n';
import { SERVING_GROUPS } from '@/lib/types';
import type { AppLanguage, ServingGroup } from '@/lib/types';
import {
  generateSchedule,
  publishSchedule,
  unpublishSchedule,
  type GenerateWarning,
} from '../actions';

export type StationCol = { id: string; name: string; minVolunteers: number };

export type CellData = {
  stationId: string;
  names: string[];
  /** Fewer people than min_volunteers asked for. Computed on read by counting
      assignments against the station's requirement — there is no stored flag,
      and a derived one cannot go stale. */
  understaffed: boolean;
};

export type SundayRow = {
  date: string;
  dateLabel: string;
  group: ServingGroup | null;
  isFifthSunday: boolean;
  scheduleId: string | null;
  published: boolean;
  cells: CellData[];
};

type Filter = 'all' | 'unassigned' | ServingGroup;

const GROUP_TONE: Record<ServingGroup, string> = {
  A: 'bg-indigo-royal-50 text-indigo-royal-700',
  B: 'bg-emerald-50 text-emerald-700',
  C: 'bg-amber-50 text-amber-700',
  D: 'bg-sky-50 text-sky-700',
  E: 'bg-gold-warm-100 text-gold-warm-700',
};

export function ScheduleGrid({
  lang,
  year,
  month,
  monthOptions,
  monthName,
  stations,
  rows,
  initialWarnings,
}: {
  lang: AppLanguage;
  year: number;
  month: number;
  monthOptions: Array<{ year: number; month: number; label: string }>;
  monthName: string;
  stations: StationCol[];
  rows: SundayRow[];
  initialWarnings: GenerateWarning[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [warnings, setWarnings] = useState<GenerateWarning[]>(initialWarnings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'unassigned') {
      // A row is interesting under this filter if anything on it is missing —
      // an empty cell or a partly-filled one.
      return rows.filter((r) =>
        r.cells.some((c) => c.names.length === 0 || c.understaffed),
      );
    }
    return rows.filter((r) => r.group === filter);
  }, [rows, filter]);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        const key = `rotation.admin.err.${res.error}`;
        const translated = t(key, lang);
        setError(translated === key ? (res.error ?? 'not_admin') : translated);
        return;
      }
      router.refresh();
    });
  }

  function generate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await generateSchedule(year, month);
      if (!res.ok) {
        const key = `rotation.admin.err.${res.error}`;
        const translated = t(key, lang);
        setError(translated === key ? res.error : translated);
        return;
      }
      setWarnings(res.warnings);
      setMessage(
        res.created > 0
          ? t('rotation.admin.schedule.toast_generated', lang).replace(
              '{count}',
              String(res.created),
            )
          : t('rotation.admin.schedule.toast_nothing', lang),
      );
      router.refresh();
    });
  }

  const filters: Array<{ key: Filter; label: string }> = [
    { key: 'all', label: t('rotation.admin.schedule.filter_all', lang) },
    {
      key: 'unassigned',
      label: t('rotation.admin.schedule.filter_unassigned', lang),
    },
    ...SERVING_GROUPS.map((g) => ({
      key: g as Filter,
      label: t(`rotation.group.${g}`, lang),
    })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{t('rotation.admin.schedule.month_selector', lang)}</p>
          <div className="flex flex-wrap gap-1">
            {monthOptions.map((m) => {
              const active = m.year === year && m.month === month;
              return (
                <Link
                  key={`${m.year}-${m.month}`}
                  href={`/admin/rotation/schedule?year=${m.year}&month=${m.month}`}
                  aria-current={active ? 'page' : undefined}
                  className={
                    'rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition ' +
                    (active
                      ? 'border-indigo-royal-700 bg-indigo-royal-50 text-indigo-royal-700'
                      : 'border-gray-200 bg-white text-muted hover:text-ink')
                  }
                >
                  {m.label}
                </Link>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={pending || stations.length === 0 || rows.length === 0}
          onClick={generate}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {pending
            ? t('rotation.admin.schedule.generating', lang)
            : t('rotation.admin.schedule.generate_button', lang).replace(
                '{month}',
                monthName,
              )}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* An empty group is a recruiting problem, not an error, so it is
          reported after the run rather than aborting it. */}
      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((w) => (
            <div
              key={`${w.date}-${w.group}`}
              className="flex items-start gap-2 rounded-lg border border-gold-warm-200 bg-gold-warm-50 px-4 py-3 text-sm"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-gold-warm-700"
                aria-hidden="true"
              />
              <div>
                <p className="text-ink">
                  {t('rotation.admin.schedule.empty_group_warning', lang)
                    .replace('{group}', t(`rotation.group.${w.group}`, lang))
                    .replace('{date}', w.date)}
                </p>
                {w.group === 'E' && (
                  <p className="mt-0.5 text-xs text-gold-warm-800">
                    {t('rotation.admin.schedule.empty_group_e_prompt', lang)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={
              'rounded-full border px-3 py-1 text-xs font-semibold transition ' +
              (filter === f.key
                ? 'border-indigo-royal-200 bg-indigo-royal-50 text-indigo-royal-700'
                : 'border-gray-200 bg-white text-muted hover:text-ink')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {stations.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-body">
          {t('rotation.admin.schedule.no_stations', lang)}
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-body">
          {t('rotation.admin.schedule.not_generated', lang)}
        </p>
      ) : (
        // Scrolls inside its own container: a grid this wide must never make
        // the page body scroll sideways on a phone.
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t('rotation.admin.schedule.month_selector', lang)}
                </th>
                {stations.map((s) => (
                  <th key={s.id} className="px-4 py-3 font-semibold">
                    {s.name}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((r) => (
                <tr key={r.date} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{r.dateLabel}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {r.group && (
                        <span
                          className={
                            'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                            GROUP_TONE[r.group]
                          }
                        >
                          {t(`rotation.group.${r.group}`, lang)}
                        </span>
                      )}
                      {r.isFifthSunday && (
                        <span className="rounded-full bg-gold-warm-100 px-2 py-0.5 text-[10px] font-bold text-gold-warm-700">
                          {t('rotation.admin.schedule.fifth_sunday_marker', lang)}
                        </span>
                      )}
                      <span
                        className={
                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold ' +
                          (r.published
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-white text-muted')
                        }
                      >
                        {t(
                          r.published
                            ? 'rotation.admin.schedule.published_badge'
                            : 'rotation.admin.schedule.draft_badge',
                          lang,
                        )}
                      </span>
                    </div>
                  </td>

                  {stations.map((s) => {
                    const cell = r.cells.find((c) => c.stationId === s.id);
                    const names = cell?.names ?? [];
                    return (
                      <td key={s.id} className="px-4 py-3">
                        {names.length === 0 ? (
                          <span className="text-xs italic text-muted">
                            {t('rotation.admin.schedule.unassigned', lang)}
                          </span>
                        ) : (
                          <ul className="space-y-1">
                            {names.map((n) => (
                              <li
                                key={n}
                                className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-ink"
                              >
                                {n}
                              </li>
                            ))}
                          </ul>
                        )}
                        {cell?.understaffed && names.length > 0 && (
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gold-warm-700">
                            {t('rotation.admin.schedule.understaffed', lang)}{' '}
                            {t('rotation.admin.schedule.understaffed_detail', lang)
                              .replace('{have}', String(names.length))
                              .replace('{need}', String(s.minVolunteers))}
                          </p>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-4 py-3 text-right">
                    {r.scheduleId && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            r.published
                              ? unpublishSchedule(r.scheduleId as string)
                              : publishSchedule(r.scheduleId as string),
                          )
                        }
                        className="whitespace-nowrap text-xs font-semibold text-indigo-royal-700 hover:underline disabled:opacity-50"
                        title={
                          r.published
                            ? t('rotation.admin.schedule.unpublish_note', lang)
                            : undefined
                        }
                      >
                        {t(
                          r.published
                            ? 'rotation.admin.schedule.unpublish_button'
                            : 'rotation.admin.schedule.publish_button',
                          lang,
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        {t('rotation.admin.schedule.published_lock', lang)}
      </p>
    </div>
  );
}
