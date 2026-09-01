'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Pencil, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, Zone } from '@/lib/types';
import type { CoordinatorOption } from '@/app/admin/branches/_manager';
import { createZone, deleteZone, updateZone } from './actions';

function mapError(code: string, lang: AppLanguage): string {
  const key = `zones.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

type Draft = { id: string | null; name: string; coordinatorUserId: string };

const emptyDraft = (): Draft => ({ id: null, name: '', coordinatorUserId: '' });

export function ZonesManager({
  lang,
  branchId,
  branchName,
  zones,
  coordinators,
  canDelete,
}: {
  lang: AppLanguage;
  branchId: string;
  branchName: string;
  zones: Zone[];
  coordinators: CoordinatorOption[];
  /** Deleting is owner-only, matching the zones_delete policy. */
  canDelete: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Zone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const coordinatorName = (id: string | null) =>
    coordinators.find((c) => c.id === id)?.name ?? null;

  function save() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const res = draft.id
        ? await updateZone({
            id: draft.id,
            name: draft.name,
            coordinatorUserId: draft.coordinatorUserId || null,
          })
        : await createZone({
            branchId,
            name: draft.name,
            coordinatorUserId: draft.coordinatorUserId || null,
          });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteZone(deleting.id);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDraft(emptyDraft());
          }}
          className="btn-primary"
        >
          {t('zones.add_button', lang)}
        </button>
      </div>

      {error && !draft && !deleting && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {zones.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Globe
            className="mx-auto h-10 w-10 text-indigo-royal-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="mt-4 text-lg font-bold text-ink">
            {t('zones.empty_title', lang).replace('{branch_name}', branchName)}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-body">
            {t('zones.empty_body', lang)}
          </p>
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="btn-primary mt-6"
          >
            {t('zones.add_button', lang)}
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <li
              key={z.id}
              className="rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-card-hover"
            >
              <h3 className="truncate text-base font-bold text-ink">{z.name}</h3>
              <p className="mt-1 truncate text-sm text-body">
                {coordinatorName(z.coordinator_user_id) ?? (
                  <span className="text-muted">
                    {t('zones.no_coordinator', lang)}
                  </span>
                )}
              </p>
              <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDraft({
                      id: z.id,
                      name: z.name,
                      coordinatorUserId: z.coordinator_user_id ?? '',
                    });
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-ink"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  {t('zones.edit_action', lang)}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDeleting(z);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('zones.delete_action', lang)}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <Modal
          titleId="zone-form-title"
          title={t(draft.id ? 'zones.edit_title' : 'zones.add_title', lang)}
          onClose={() => !pending && setDraft(null)}
        >
          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="zone-name">
                {t('zones.form.name_label', lang)}
              </label>
              <input
                id="zone-name"
                className="input"
                required
                maxLength={80}
                value={draft.name}
                placeholder={t('zones.form.name_placeholder', lang)}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="zone-coordinator">
                {t('zones.form.coordinator_label', lang)}
              </label>
              <select
                id="zone-coordinator"
                className="input"
                value={draft.coordinatorUserId}
                onChange={(e) =>
                  setDraft({ ...draft, coordinatorUserId: e.target.value })
                }
              >
                <option value="">{t('zones.form.coordinator_none', lang)}</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.roleLabel}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
          </div>
          <ModalActions
            lang={lang}
            pending={pending}
            onCancel={() => setDraft(null)}
            onConfirm={save}
            confirmLabel={t('zones.form.save', lang)}
            confirmClass="btn-primary"
            disabled={!draft.name.trim()}
          />
        </Modal>
      )}

      {deleting && (
        <Modal
          titleId="zone-delete-title"
          title={t('zones.delete_title', lang)}
          onClose={() => !pending && setDeleting(null)}
        >
          <p className="mt-2 text-sm text-body">
            {t('zones.delete_body', lang)
              .replace('{zone_name}', deleting.name)
              .replace('{branch_name}', branchName)}
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <ModalActions
            lang={lang}
            pending={pending}
            onCancel={() => setDeleting(null)}
            onConfirm={confirmDelete}
            confirmLabel={t('zones.delete_confirm', lang)}
            confirmClass="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  titleId,
  onClose,
  children,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  lang,
  pending,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmClass,
  disabled = false,
}: {
  lang: AppLanguage;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmClass: string;
  disabled?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Focus the safe option so a stray Enter cannot confirm a delete.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        ref={cancelRef}
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="btn-secondary"
      >
        {t('zones.form.cancel', lang)}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending || disabled}
        className={confirmClass}
      >
        {pending ? t('common.loading', lang) : confirmLabel}
      </button>
    </div>
  );
}
