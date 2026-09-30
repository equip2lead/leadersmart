'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { t } from '@/lib/i18n';
import { FIFTH_SUNDAY_GROUP, ROTATION_GROUPS } from '@/lib/types';
import type { AppLanguage, ServingGroup } from '@/lib/types';
import { updateVolunteer } from './actions';
import type { VolunteerRow } from './_directory';

// Edit dialog for a volunteer's own details.
//
// A modal rather than a page because the edit is a correction — a wrong digit,
// a misspelt name — and sending someone to a separate route to fix one
// character loses the list position they were working down.

export type StationOption = { id: string; name: string };

export function EditVolunteerModal({
  lang,
  volunteer,
  stations,
  onClose,
  onSaved,
}: {
  lang: AppLanguage;
  volunteer: VolunteerRow;
  stations: StationOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [fullName, setFullName] = useState(volunteer.fullName);
  const [phone, setPhone] = useState(volunteer.phone);
  const [email, setEmail] = useState(volunteer.email ?? '');
  const [groups, setGroups] = useState<ServingGroup[]>(volunteer.groups);
  const [stationIds, setStationIds] = useState<string[]>(volunteer.stationIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const firstField = useRef<HTMLInputElement>(null);

  // Focus moves into the dialog on open and Escape closes it — the two things
  // a keyboard user needs that a plain div does not give them.
  useEffect(() => {
    firstField.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateVolunteer(volunteer.id, {
        fullName,
        phone,
        email: email || null,
        groups,
        stationIds,
      });
      if (!res.ok) {
        const key = `rotation.admin.err.${res.error}`;
        const translated = t(key, lang);
        setError(translated === key ? res.error : translated);
        return;
      }
      onSaved(t('rotation.admin.volunteers.edit_saved', lang));
    });
  }

  const canSave =
    fullName.trim().length > 0 && phone.trim().length > 0 && groups.length > 0 && !pending;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      {/* Full-height sheet on a phone, centred card above sm. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('rotation.admin.volunteers.edit_modal_title', lang)}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-card sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">
            {t('rotation.admin.volunteers.edit_modal_title', lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('events.form.cancel', lang)}
            className="shrink-0 text-muted hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="ev-name">
              {t('rotation.admin.volunteers.edit_name', lang)}
            </label>
            <input
              ref={firstField}
              id="ev-name"
              className="input"
              value={fullName}
              disabled={pending}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="ev-phone">
              {t('rotation.admin.volunteers.edit_phone', lang)}
            </label>
            <input
              id="ev-phone"
              type="tel"
              className="input"
              value={phone}
              disabled={pending}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              {t('rotation.admin.volunteers.edit_phone_hint', lang)}
            </p>
          </div>

          <div>
            <label className="label" htmlFor="ev-email">
              {t('rotation.admin.volunteers.edit_email', lang)}
            </label>
            <input
              id="ev-email"
              type="email"
              className="input"
              value={email}
              disabled={pending}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="label">
              {t('rotation.admin.volunteers.edit_groups', lang)}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {[...ROTATION_GROUPS, FIFTH_SUNDAY_GROUP].map((g) => {
                const on = groups.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    disabled={pending}
                    onClick={() => setGroups((prev) => toggle(prev, g))}
                    className={
                      'rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ' +
                      (on
                        ? 'border-indigo-royal-200 bg-indigo-royal-50 text-indigo-royal-700'
                        : 'border-gray-200 bg-white text-muted hover:text-ink')
                    }
                  >
                    {t(`rotation.group.${g}`, lang)}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {t('rotation.admin.volunteers.edit_groups_hint', lang)}
            </p>
          </fieldset>

          <fieldset>
            <legend className="label">
              {t('rotation.admin.volunteers.edit_stations', lang)}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {stations.map((s) => {
                const on = stationIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    disabled={pending}
                    onClick={() => setStationIds((prev) => toggle(prev, s.id))}
                    className={
                      'rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ' +
                      (on
                        ? 'border-indigo-royal-200 bg-indigo-royal-50 text-indigo-royal-700'
                        : 'border-gray-200 bg-white text-muted hover:text-ink')
                    }
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {t('rotation.admin.volunteers.edit_stations_hint', lang)}
            </p>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            className="text-sm font-medium text-muted hover:text-ink"
            disabled={pending}
            onClick={onClose}
          >
            {t('events.form.cancel', lang)}
          </button>
          <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
            {t('rotation.admin.volunteers.edit_save', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
