'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Pencil, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { COUNTRIES, flagForCode } from '@/lib/countries';
import type { AppLanguage, Branch } from '@/lib/types';
import { createBranch, deleteBranch, updateBranch } from './actions';

export type CoordinatorOption = {
  id: string;
  name: string;
  roleLabel: string;
};

function mapError(code: string, lang: AppLanguage): string {
  // hq_conflict has its own top-level key; everything else lives under
  // branches.err.*. Falls back to the raw code so a new server error is
  // visible rather than silently blank.
  const key = code === 'hq_conflict' ? 'branches.hq_conflict' : `branches.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

type Draft = {
  id: string | null;
  name: string;
  countryCode: string;
  city: string;
  coordinatorUserId: string;
  isHeadquarters: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  name: '',
  countryCode: '',
  city: '',
  coordinatorUserId: '',
  isHeadquarters: false,
});

export function BranchesManager({
  lang,
  branches,
  coordinators,
  canDelete,
}: {
  lang: AppLanguage;
  branches: Branch[];
  coordinators: CoordinatorOption[];
  /** Deleting is owner-only, matching the branches_delete policy. */
  canDelete: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nameOf = (id: string | null) =>
    coordinators.find((c) => c.id === id)?.name ?? null;

  function save() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const payload = {
        name: draft.name,
        countryCode: draft.countryCode,
        city: draft.city,
        coordinatorUserId: draft.coordinatorUserId || null,
        isHeadquarters: draft.isHeadquarters,
      };
      const res = draft.id
        ? await updateBranch({ ...payload, id: draft.id })
        : await createBranch(payload);
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
      const res = await deleteBranch(deleting.id);
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
          {t('branches.add_button', lang)}
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

      {branches.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Globe
            className="mx-auto h-10 w-10 text-indigo-royal-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="mt-4 text-lg font-bold text-ink">
            {t('branches.empty_title', lang)}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-body">
            {t('branches.empty_body', lang)}
          </p>
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="btn-primary mt-6"
          >
            {t('branches.add_button', lang)}
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <li
              key={b.id}
              className={
                'rounded-2xl border bg-white p-6 transition hover:shadow-card-hover ' +
                (b.is_headquarters
                  ? 'border-indigo-royal-200 ring-1 ring-indigo-royal-100'
                  : 'border-gray-200')
              }
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl leading-none" aria-hidden="true">
                  {flagForCode(b.country_code)}
                </span>
                {b.is_headquarters && (
                  <span className="rounded-full bg-indigo-royal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-royal-700">
                    {t('branches.hq_badge', lang)}
                  </span>
                )}
              </div>

              <h3 className="mt-3 truncate text-lg font-bold text-ink">{b.name}</h3>
              {b.city && <p className="text-sm text-muted">{b.city}</p>}
              <p className="mt-2 truncate text-sm text-body">
                {nameOf(b.coordinator_user_id) ?? (
                  <span className="text-muted">
                    {t('branches.no_coordinator', lang)}
                  </span>
                )}
              </p>

              <div className="mt-5 flex items-center gap-4 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDraft({
                      id: b.id,
                      name: b.name,
                      countryCode: b.country_code,
                      city: b.city ?? '',
                      coordinatorUserId: b.coordinator_user_id ?? '',
                      isHeadquarters: b.is_headquarters,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-ink"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  {t('branches.edit_action', lang)}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDeleting(b);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('branches.delete_action', lang)}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <Modal
          titleId="branch-form-title"
          title={t(draft.id ? 'branches.edit_title' : 'branches.add_title', lang)}
          onClose={() => !pending && setDraft(null)}
        >
          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="branch-name">
                {t('branches.form.name_label', lang)}
              </label>
              <input
                id="branch-name"
                className="input"
                required
                maxLength={80}
                value={draft.name}
                placeholder={t('branches.form.name_placeholder', lang)}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="branch-country">
                {t('branches.form.country_label', lang)}
              </label>
              <select
                id="branch-country"
                className="input"
                value={draft.countryCode}
                onChange={(e) => setDraft({ ...draft, countryCode: e.target.value })}
              >
                <option value="">
                  {t('branches.form.country_placeholder', lang)}
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="branch-city">
                {t('branches.form.city_label', lang)}
              </label>
              <input
                id="branch-city"
                className="input"
                maxLength={80}
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              />
            </div>

            <div>
              <label className="label" htmlFor="branch-coordinator">
                {t('branches.form.coordinator_label', lang)}
              </label>
              <select
                id="branch-coordinator"
                className="input"
                value={draft.coordinatorUserId}
                onChange={(e) =>
                  setDraft({ ...draft, coordinatorUserId: e.target.value })
                }
              >
                <option value="">
                  {t('branches.form.coordinator_none', lang)}
                </option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.roleLabel}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={draft.isHeadquarters}
                onChange={(e) =>
                  setDraft({ ...draft, isHeadquarters: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-royal-700 focus:ring-indigo-royal-500"
              />
              {t('branches.form.is_hq_label', lang)}
            </label>

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
            confirmLabel={t('branches.form.save', lang)}
            confirmClass="btn-primary"
            disabled={!draft.name.trim() || !draft.countryCode}
          />
        </Modal>
      )}

      {deleting && (
        <Modal
          titleId="branch-delete-title"
          title={t('branches.delete_title', lang)}
          onClose={() => !pending && setDeleting(null)}
        >
          <p className="mt-2 text-sm text-body">
            {t('branches.delete_body', lang).replace('{name}', deleting.name)}
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
            confirmLabel={t('branches.delete_confirm', lang)}
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
  // Escape closes, and the backdrop click closes — but a click inside the
  // panel must not bubble out and dismiss it mid-edit.
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
  // Focus the non-destructive option so a stray Enter cannot confirm.
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
        {t('branches.form.cancel', lang)}
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
