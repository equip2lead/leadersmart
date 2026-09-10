'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, UserMinus, UserPlus } from 'lucide-react';
import { t } from '@/lib/i18n';
import { initialsOf } from '@/lib/leaders';
import { formatEventDate } from '@/lib/events';
import { FIFTH_SUNDAY_GROUP } from '@/lib/types';
import type { AppLanguage, ServingGroup, VolunteerStatus } from '@/lib/types';
import { deleteVolunteer, setGroupEMembership, setVolunteerStatus } from './actions';

export type VolunteerRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  groups: ServingGroup[];
  stations: string[];
  status: VolunteerStatus;
  joinedAt: string;
};

function mapError(code: string, lang: AppLanguage): string {
  const key = `rotation.admin.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

const GROUP_TONE: Record<ServingGroup, string> = {
  A: 'bg-indigo-royal-50 text-indigo-royal-700',
  B: 'bg-emerald-50 text-emerald-700',
  C: 'bg-amber-50 text-amber-700',
  D: 'bg-sky-50 text-sky-700',
  // E reads differently on purpose — it is a different kind of commitment,
  // not the fifth item in the same sequence.
  E: 'bg-gold-warm-100 text-gold-warm-700 ring-1 ring-gold-warm-200',
};

export function VolunteerDirectory({
  lang,
  rows,
  canDelete,
}: {
  lang: AppLanguage;
  rows: VolunteerRow[];
  /** Owner only — deleting takes the assignment history with it. */
  canDelete: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.length === rows.length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(mapError(res.error ?? 'not_admin', lang));
        return;
      }
      setSelected([]);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* The bulk bar appears only with a selection, so it never takes space
          from the table it acts on. */}
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-royal-200 bg-indigo-royal-50 px-4 py-3">
          <span className="text-sm font-semibold text-indigo-royal-800">
            {t('rotation.admin.volunteers.selected', lang).replace(
              '{count}',
              String(selected.length),
            )}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary !py-1.5"
              disabled={pending}
              onClick={() => run(() => setGroupEMembership(selected, true))}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('rotation.admin.volunteers.add_to_group_e', lang)}
            </button>
            <button
              type="button"
              className="btn-secondary !py-1.5"
              disabled={pending}
              onClick={() => run(() => setGroupEMembership(selected, false))}
            >
              <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('rotation.admin.volunteers.remove_from_group_e', lang)}
            </button>
          </div>
        </div>
      )}

      {/* Scrolls inside its own container so the page body never scrolls
          sideways on a phone. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label={t('rotation.admin.volunteers.col_name', lang)}
                  checked={allSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? rows.map((r) => r.id) : [])
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-royal-700 focus:ring-indigo-royal-500"
                />
              </th>
              <th className="px-3 py-3 font-semibold">
                {t('rotation.admin.volunteers.col_name', lang)}
              </th>
              <th className="px-3 py-3 font-semibold">
                {t('rotation.admin.volunteers.col_contact', lang)}
              </th>
              <th className="px-3 py-3 font-semibold">
                {t('rotation.admin.volunteers.col_groups', lang)}
              </th>
              <th className="px-3 py-3 font-semibold">
                {t('rotation.admin.volunteers.col_stations', lang)}
              </th>
              <th className="px-3 py-3 font-semibold">
                {t('rotation.admin.volunteers.col_joined', lang)}
              </th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className={r.status !== 'active' ? 'opacity-60' : ''}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={r.fullName}
                    checked={selected.includes(r.id)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked
                          ? [...prev, r.id]
                          : prev.filter((x) => x !== r.id),
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-royal-700 focus:ring-indigo-royal-500"
                  />
                </td>

                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-body"
                      aria-hidden="true"
                    >
                      {initialsOf(r.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{r.fullName}</p>
                      {r.status !== 'active' && (
                        <p className="text-[11px] font-medium text-muted">
                          {t(
                            r.status === 'paused'
                              ? 'rotation.admin.volunteers.status_paused'
                              : 'rotation.admin.volunteers.status_inactive',
                            lang,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-3 py-3 text-xs text-body">
                  <p>{r.phone}</p>
                  {r.email && <p className="text-muted">{r.email}</p>}
                </td>

                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.groups.map((g) => (
                      <span
                        key={g}
                        title={t(`rotation.group.${g}`, lang)}
                        className={
                          'rounded-full px-2 py-0.5 text-[10px] font-bold ' + GROUP_TONE[g]
                        }
                      >
                        {t(`rotation.group_short.${g}`, lang)}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="px-3 py-3">
                  {r.stations.length === 0 ? (
                    <span className="text-xs text-muted">
                      {t('rotation.admin.volunteers.no_stations', lang)}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {r.stations.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-body"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td className="px-3 py-3 text-xs text-muted">
                  {formatEventDate(r.joinedAt.slice(0, 10), lang)}
                </td>

                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setVolunteerStatus(
                            r.id,
                            r.status === 'active' ? 'inactive' : 'active',
                          ),
                        )
                      }
                      className="text-xs font-medium text-muted hover:text-ink"
                    >
                      {t(
                        r.status === 'active'
                          ? 'rotation.admin.volunteers.deactivate'
                          : 'rotation.admin.volunteers.reactivate',
                        lang,
                      )}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={pending}
                        aria-label={t('rotation.admin.volunteers.delete', lang)}
                        onClick={() => setConfirmDelete(r.id)}
                        className="text-muted hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <div
          role="alertdialog"
          aria-label={t('rotation.admin.volunteers.confirm_delete', lang)}
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-ink">
            {t('rotation.admin.volunteers.confirm_delete', lang)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteVolunteer(confirmDelete))}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {t('rotation.admin.volunteers.delete', lang)}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmDelete(null)}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              {t('events.form.cancel', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
