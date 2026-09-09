'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { eventTypeLabel } from '@/lib/vocabulary';
import { MAX_EVENT_DESCRIPTION, MAX_EVENT_TITLE } from '@/lib/events';
import type { AppLanguage } from '@/lib/types';
import { createEvent, updateEvent, type EventInput } from './actions';

// The event form, shared by create and edit.
//
// Scope is a single dropdown, not two: which one it is depends on org type,
// and the page decides that by passing either branches or departments. That
// mirrors the events_scope_is_one_of CHECK — the UI cannot offer a
// combination the database would reject.

export type ScopeOption = { id: string; name: string };

export type EventFormInitial = EventInput & { id: string; status: string };

function mapError(code: string, lang: AppLanguage): string {
  const key = `events.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

export function EventForm({
  lang,
  /** 'branch' for ministries, 'department' for churches. */
  scopeKind,
  scopeOptions,
  scopeLabel,
  people,
  eventTypes,
  initial,
}: {
  lang: AppLanguage;
  scopeKind: 'branch' | 'department';
  scopeOptions: ScopeOption[];
  scopeLabel: string;
  people: ScopeOption[];
  eventTypes: readonly string[];
  /** Absent for a new event; present when editing an existing one. */
  initial?: EventFormInitial;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [eventType, setEventType] = useState(initial?.eventType ?? eventTypes[0] ?? 'other');
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [scopeId, setScopeId] = useState(
    (scopeKind === 'branch' ? initial?.branchId : initial?.departmentId) ?? '',
  );
  const [coordinator, setCoordinator] = useState(initial?.coordinatorUserId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const overDescription = description.length > MAX_EVENT_DESCRIPTION;
  const canSubmit =
    title.trim().length > 0 && eventDate.length > 0 && !overDescription && !pending;

  function build(): EventInput {
    return {
      title,
      eventType,
      eventDate,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location || null,
      description: description || null,
      // Only ever one of the two is populated; the other stays null so the
      // CHECK is satisfied by construction.
      branchId: scopeKind === 'branch' ? scopeId || null : null,
      departmentId: scopeKind === 'department' ? scopeId || null : null,
      coordinatorUserId: coordinator || null,
    };
  }

  function submit(publish: boolean) {
    setError(null);
    startTransition(async () => {
      // Create and update return different shapes — create hands back the new
      // id, update has nothing to hand back — so the destination is resolved
      // inside each branch rather than from a merged union.
      let destination: string;
      if (initial) {
        const res = await updateEvent(initial.id, build());
        if (!res.ok) {
          setError(mapError(res.error, lang));
          return;
        }
        destination = `/admin/events/${initial.id}`;
      } else {
        const res = await createEvent(build(), publish);
        if (!res.ok) {
          setError(mapError(res.error, lang));
          return;
        }
        destination = `/admin/events/${res.id}`;
      }
      router.push(destination);
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <label className="label" htmlFor="event-title">
          {t('events.form.title_label', lang)}
        </label>
        <input
          id="event-title"
          className="input"
          value={title}
          maxLength={MAX_EVENT_TITLE}
          disabled={pending}
          placeholder={t('events.form.title_placeholder', lang)}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="event-type">
            {t('events.form.type_label', lang)}
          </label>
          <select
            id="event-type"
            className="input"
            value={eventType}
            disabled={pending}
            onChange={(e) => setEventType(e.target.value)}
          >
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {eventTypeLabel(type, lang)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="event-date">
            {t('events.form.date_label', lang)}
          </label>
          <input
            id="event-date"
            type="date"
            className="input"
            value={eventDate}
            disabled={pending}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="event-start">
            {t('events.form.start_time_label', lang)}{' '}
            <span className="font-normal text-muted">
              ({t('events.form.time_optional', lang)})
            </span>
          </label>
          <input
            id="event-start"
            type="time"
            className="input"
            value={startTime}
            disabled={pending}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="event-end">
            {t('events.form.end_time_label', lang)}{' '}
            <span className="font-normal text-muted">
              ({t('events.form.time_optional', lang)})
            </span>
          </label>
          <input
            id="event-end"
            type="time"
            className="input"
            value={endTime}
            disabled={pending}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="event-location">
          {t('events.form.location_label', lang)}
        </label>
        <input
          id="event-location"
          className="input"
          value={location}
          disabled={pending}
          placeholder={t('events.form.location_placeholder', lang)}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="event-description">
          {t('events.form.description_label', lang)}
        </label>
        <textarea
          id="event-description"
          className="input min-h-[120px]"
          value={description}
          disabled={pending}
          placeholder={t('events.form.description_placeholder', lang)}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p
          className={
            'mt-1.5 text-xs ' +
            (overDescription ? 'font-semibold text-red-600' : 'text-muted')
          }
        >
          {t('events.form.char_counter', lang)
            .replace('{count}', String(description.length))
            .replace('{max}', String(MAX_EVENT_DESCRIPTION))}
        </p>
      </div>

      {/* Hidden entirely when the org has no branches/departments yet — an
          empty dropdown offering only "None" is noise, not a choice. */}
      {scopeOptions.length > 0 && (
        <div>
          <label className="label" htmlFor="event-scope">
            {scopeLabel}
          </label>
          <select
            id="event-scope"
            className="input"
            value={scopeId}
            disabled={pending}
            onChange={(e) => setScopeId(e.target.value)}
          >
            <option value="">{t('events.form.none_option', lang)}</option>
            {scopeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="event-coordinator">
          {t('events.form.coordinator_label', lang)}
        </label>
        <select
          id="event-coordinator"
          className="input"
          value={coordinator}
          disabled={pending}
          onChange={(e) => setCoordinator(e.target.value)}
        >
          <option value="">{t('events.form.none_option', lang)}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-5">
        {initial ? (
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={() => submit(false)}
          >
            {t('events.form.save', lang)}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary"
              disabled={!canSubmit}
              onClick={() => submit(false)}
            >
              {t('events.form.save_draft', lang)}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canSubmit}
              onClick={() => submit(true)}
            >
              {t('events.form.publish', lang)}
            </button>
          </>
        )}
        <button
          type="button"
          className="ml-auto text-sm font-medium text-muted hover:text-ink"
          disabled={pending}
          onClick={() => router.back()}
        >
          {t('events.form.cancel', lang)}
        </button>
      </div>
    </div>
  );
}
