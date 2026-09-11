'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { AlertTriangle, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { SERVING_GROUPS } from '@/lib/types';
import type { AppLanguage, ServingGroup } from '@/lib/types';
import {
  generateSchedule,
  publishSchedule,
  resetWeek,
  swapAssignment,
  unpublishSchedule,
  type GenerateWarning,
} from '../actions';
import { AssignmentChip, StationCell, type ChipTarget } from './_chip';

export type StationCol = { id: string; name: string; minVolunteers: number };

/** One assigned person in one cell. Carries the assignment id because that is
    what a move updates — a name is not addressable. */
export type CellPerson = { assignmentId: string; name: string };

export type CellData = {
  stationId: string;
  people: CellPerson[];
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

/** A move that has been applied, kept so it can be reversed. */
type HistoryEntry = {
  assignmentId: string;
  name: string;
  fromStationId: string;
  fromDate: string;
};

const UNDO_DEPTH = 5;

const GROUP_TONE: Record<ServingGroup, string> = {
  A: 'bg-indigo-royal-50 text-indigo-royal-700',
  B: 'bg-emerald-50 text-emerald-700',
  C: 'bg-amber-50 text-amber-700',
  D: 'bg-sky-50 text-sky-700',
  E: 'bg-gold-warm-100 text-gold-warm-700',
};

function errorText(code: string | undefined, lang: AppLanguage): string {
  const key = `rotation.admin.err.${code ?? 'not_admin'}`;
  const translated = t(key, lang);
  return translated === key ? (code ?? 'not_admin') : translated;
}

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
  const [dragging, setDragging] = useState<CellPerson | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A small activation distance so a click on the grip is still a click; only
  // a deliberate drag starts one.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visible = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'unassigned') {
      return rows.filter((r) =>
        r.cells.some((c) => c.people.length === 0 || c.understaffed),
      );
    }
    return rows.filter((r) => r.group === filter);
  }, [rows, filter]);

  /** Where a given chip is allowed to be sent, for the keyboard menu. Only
      unpublished Sundays, and never the cell it already occupies. */
  const targetsFor = useMemo(
    () => (fromDate: string, fromStationId: string): ChipTarget[] =>
      rows
        .filter((r) => !r.published)
        .flatMap((r) =>
          stations
            .filter((s) => !(r.date === fromDate && s.id === fromStationId))
            .map((s) => ({
              stationId: s.id,
              date: r.date,
              label: `${r.dateLabel} · ${s.name}`,
            })),
        ),
    [rows, stations],
  );

  function locate(assignmentId: string): { row: SundayRow; cell: CellData; person: CellPerson } | null {
    for (const row of rows) {
      for (const cell of row.cells) {
        const person = cell.people.find((p) => p.assignmentId === assignmentId);
        if (person) return { row, cell, person };
      }
    }
    return null;
  }

  /**
   * Apply a move.
   *
   * Optimism here is limited on purpose: the grid is server-rendered, so
   * rather than mutating a local copy the UI refreshes on success and simply
   * does not change on failure. The effect a user sees is the same — the chip
   * lands, or it snaps back with a reason — without a second source of truth
   * that could disagree with the database.
   */
  function move(
    assignmentId: string,
    toStationId: string,
    toDate: string,
    opts: { record?: boolean } = { record: true },
  ) {
    const found = locate(assignmentId);
    if (!found) return;
    if (found.row.date === toDate && found.cell.stationId === toStationId) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const res = await swapAssignment(assignmentId, toStationId, toDate);
      if (!res.ok) {
        setError(errorText(res.error, lang));
        return;
      }
      if (opts.record !== false) {
        setHistory((prev) =>
          [
            {
              assignmentId,
              name: found.person.name,
              fromStationId: found.cell.stationId,
              fromDate: found.row.date,
            },
            ...prev,
          ].slice(0, UNDO_DEPTH),
        );
      }
      setMessage(
        t('rotation.admin.dnd.swap_success', lang).replace('{name}', found.person.name),
      );
      router.refresh();
    });
  }

  function undo() {
    const last = history[0];
    if (!last) {
      setMessage(t('rotation.admin.dnd.undo_none', lang));
      return;
    }
    setHistory((prev) => prev.slice(1));
    // Recording an undo would let undo undo itself forever.
    move(last.assignmentId, last.fromStationId, last.fromDate, { record: false });
  }

  function onDragStart(event: DragStartEvent) {
    const found = locate(String(event.active.id));
    setDragging(found?.person ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const over = event.over;
    if (!over) return;
    const [toDate, toStationId] = String(over.id).split('::');
    if (!toDate || !toStationId) return;
    move(String(event.active.id), toStationId, toDate);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(errorText(res.error, lang));
        return;
      }
      setConfirmReset(null);
      router.refresh();
    });
  }

  function generate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await generateSchedule(year, month);
      if (!res.ok) {
        setError(errorText(res.error, lang));
        return;
      }
      setWarnings(res.warnings);
      // A regenerate invalidates every recorded move — those assignment rows
      // no longer exist, so offering to undo into them would fail.
      setHistory([]);
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
    { key: 'unassigned', label: t('rotation.admin.schedule.filter_unassigned', lang) },
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={pending || history.length === 0}
            onClick={undo}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            {t('rotation.admin.dnd.undo', lang)}
            {history.length > 0 && (
              <span className="text-muted">({history.length})</span>
            )}
          </button>

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

      {confirmReset && (
        <div
          role="alertdialog"
          aria-label={t('rotation.admin.dnd.confirm_reset', lang)}
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-ink">{t('rotation.admin.dnd.confirm_reset', lang)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resetWeek(confirmReset))}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {t('rotation.admin.dnd.reset_week', lang)}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmReset(null)}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              {t('events.form.cancel', lang)}
            </button>
          </div>
        </div>
      )}

      {stations.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-body">
          {t('rotation.admin.schedule.no_stations', lang)}
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-body">
          {t('rotation.admin.schedule.not_generated', lang)}
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted">
            {t('rotation.admin.dnd.drag_hint', lang)}
          </p>

          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                        const people = cell?.people ?? [];
                        return (
                          <td key={s.id} className="px-4 py-3">
                            <StationCell
                              stationId={s.id}
                              date={r.date}
                              disabled={r.published}
                            >
                              {people.length === 0 ? (
                                <span className="text-xs italic text-muted">
                                  {t('rotation.admin.schedule.unassigned', lang)}
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {people.map((p) => (
                                    <AssignmentChip
                                      key={p.assignmentId}
                                      lang={lang}
                                      assignmentId={p.assignmentId}
                                      name={p.name}
                                      disabled={r.published || pending}
                                      targets={targetsFor(r.date, s.id)}
                                      onMove={move}
                                    />
                                  ))}
                                </div>
                              )}
                              {cell?.understaffed && people.length > 0 && (
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gold-warm-700">
                                  {t('rotation.admin.schedule.understaffed', lang)}{' '}
                                  {t('rotation.admin.schedule.understaffed_detail', lang)
                                    .replace('{have}', String(people.length))
                                    .replace('{need}', String(s.minVolunteers))}
                                </p>
                              )}
                            </StationCell>
                          </td>
                        );
                      })}

                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
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
                          {r.scheduleId && !r.published && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => setConfirmReset(r.date)}
                              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted hover:text-ink disabled:opacity-50"
                            >
                              <RotateCcw className="h-3 w-3" aria-hidden="true" />
                              {t('rotation.admin.dnd.reset_week', lang)}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Follows the cursor so the chip appears lifted rather than
                vanishing from its cell mid-drag. */}
            <DragOverlay>
              {dragging && (
                <div className="rounded-md border border-indigo-royal-300 bg-white px-2 py-1 text-xs font-semibold text-ink shadow-card">
                  {dragging.name}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </>
      )}

      <p className="mt-3 text-xs text-muted">
        {t('rotation.admin.schedule.published_lock', lang)}
      </p>
    </div>
  );
}
