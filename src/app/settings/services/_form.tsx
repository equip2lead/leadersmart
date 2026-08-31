'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, ChurchService } from '@/lib/types';
import { createService, deleteService, updateService } from './actions';

// Postgres returns `time` as HH:MM:SS; <input type="time"> wants HH:MM.
function toInputTime(dbTime: string): string {
  return dbTime.slice(0, 5);
}

// Start time minus the arrival offset, for the "volunteers arrive at"
// hint. Kept in minutes-since-midnight so it can't roll into a date.
function arrivalTime(startTime: string, offsetMinutes: number): string {
  const [h, m] = toInputTime(startTime).split(':').map(Number);
  const total = h * 60 + m - offsetMinutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const mm = String(wrapped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function mapError(code: string, lang: AppLanguage): string {
  const key = `settings.services.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function ServicesManager({
  lang,
  initial,
}: {
  lang: AppLanguage;
  initial: ChurchService[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onCreated() {
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {initial.length === 0 && !adding && (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-muted">
          {t('settings.services.empty', lang)}
        </p>
      )}

      <ul className="space-y-4">
        {initial.map((s) => (
          <li key={s.id}>
            <ServiceCard
              lang={lang}
              service={s}
              onError={setError}
              onDone={() => router.refresh()}
            />
          </li>
        ))}
      </ul>

      {adding ? (
        <ServiceCard
          lang={lang}
          service={null}
          onError={setError}
          onDone={onCreated}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAdding(true);
          }}
          className="btn-secondary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('settings.services.add', lang)}
        </button>
      )}
    </div>
  );
}

function ServiceCard({
  lang,
  service,
  onError,
  onDone,
  onCancel,
}: {
  lang: AppLanguage;
  service: ChurchService | null;
  onError: (msg: string | null) => void;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const isNew = service === null;
  const [name, setName] = useState(service?.name ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(service?.day_of_week ?? 0);
  const [startTime, setStartTime] = useState(
    service ? toInputTime(service.start_time) : '08:00',
  );
  const [offset, setOffset] = useState(
    service?.volunteer_arrival_offset_minutes ?? 30,
  );
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [pending, startTransition] = useTransition();

  function save() {
    onError(null);
    startTransition(async () => {
      const res = isNew
        ? await createService({
            name,
            dayOfWeek,
            startTime,
            offsetMinutes: offset,
          })
        : await updateService({
            id: service.id,
            name,
            dayOfWeek,
            startTime,
            offsetMinutes: offset,
            isActive,
          });
      if (!res.ok) {
        onError(mapError(res.error, lang));
        return;
      }
      onDone();
    });
  }

  function remove() {
    if (!service) return;
    const confirmKey = service.is_active
      ? 'settings.services.confirmDeactivate'
      : 'settings.services.confirmDelete';
    if (!window.confirm(t(confirmKey, lang))) return;

    onError(null);
    startTransition(async () => {
      const res = await deleteService(service.id);
      if (!res.ok) {
        onError(mapError(res.error, lang));
        return;
      }
      onDone();
    });
  }

  return (
    <div
      className={
        'rounded-xl border bg-white p-5 ' +
        (isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50')
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="label" htmlFor={`name-${service?.id ?? 'new'}`}>
            {t('settings.services.nameLabel', lang)}
          </label>
          <input
            id={`name-${service?.id ?? 'new'}`}
            className="input"
            value={name}
            maxLength={80}
            placeholder={t('settings.services.namePlaceholder', lang)}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor={`day-${service?.id ?? 'new'}`}>
            {t('settings.services.dayLabel', lang)}
          </label>
          <select
            id={`day-${service?.id ?? 'new'}`}
            className="input"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {t(`settings.day.${d}`, lang)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor={`time-${service?.id ?? 'new'}`}>
            {t('settings.services.timeLabel', lang)}
          </label>
          <input
            id={`time-${service?.id ?? 'new'}`}
            type="time"
            className="input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="label" htmlFor={`offset-${service?.id ?? 'new'}`}>
            {t('settings.services.offsetLabel', lang)}
          </label>
          <input
            id={`offset-${service?.id ?? 'new'}`}
            type="number"
            min={0}
            max={480}
            className="input"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
          />
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {t('settings.services.arriveAt', lang).replace(
              '{time}',
              arrivalTime(startTime, offset),
            )}
          </p>
        </div>

        {!isNew && (
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-royal-700 focus:ring-indigo-royal-500"
              />
              {t('settings.services.activeLabel', lang)}
              {!isActive && (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                  {t('settings.services.inactiveBadge', lang)}
                </span>
              )}
            </label>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isNew ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            {t('common.cancel', lang)}
          </button>
        ) : (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t(
              service.is_active
                ? 'settings.services.deactivate'
                : 'settings.services.delete',
              lang,
            )}
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary"
        >
          {pending ? t('common.loading', lang) : t('settings.services.save', lang)}
        </button>
      </div>
    </div>
  );
}
