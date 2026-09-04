'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { MATERIAL_TYPES } from '@/lib/types';
import type { AppLanguage, MaterialType, RequirementType } from '@/lib/types';
import {
  createRequirement,
  deleteRequirement,
  moveRequirement,
  updateRequirement,
} from './requirement-actions';

// One row shape for all three requirement types — the page flattens
// name/title into `label` so this component doesn't branch on which
// table a row came from, except where materials genuinely differ.
export type RequirementRow = {
  id: string;
  /** Canonical English — what the edit form binds to and what the server
      writes back. Never localised, or saving in French mode would
      overwrite the English column with a translation. */
  label: string;
  description: string | null;
  /** Localised for display only. */
  displayLabel: string;
  displayDescription: string | null;
  sortOrder: number;
  materialType?: MaterialType;
  url?: string | null;
};

function mapError(code: string, lang: AppLanguage): string {
  const key = `levels.req.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

type Draft = {
  id: string | null;
  label: string;
  description: string;
  materialType: MaterialType;
  url: string;
};

const emptyDraft = (): Draft => ({
  id: null,
  label: '',
  description: '',
  materialType: 'book',
  url: '',
});

export function RequirementSection({
  lang,
  type,
  levelDefinitionId,
  rows,
}: {
  lang: AppLanguage;
  type: RequirementType;
  levelDefinitionId: string;
  rows: RequirementRow[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<RequirementRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // competency / material / milestone -> the key prefix for its copy.
  const ns =
    type === 'competency'
      ? 'levels.competencies'
      : type === 'material'
        ? 'levels.materials'
        : 'levels.milestones';

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(mapError(res.error ?? 'unknown', lang));
        return;
      }
      done();
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-ink">{t(`${ns}.title`, lang)}</h3>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDraft(emptyDraft());
          }}
          className="text-sm font-medium text-indigo-royal-700 hover:underline"
        >
          {t(`${ns}.add`, lang)}
        </button>
      </div>

      {error && !draft && !deleting && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-muted">
          {t(`${ns}.empty`, lang)}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
            >
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => run(() => moveRequirement(type, r.id, 'up'), () => {})}
                  disabled={pending || i === 0}
                  aria-label={t('levels.req.move_up', lang)}
                  className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => run(() => moveRequirement(type, r.id, 'down'), () => {})}
                  disabled={pending || i === rows.length - 1}
                  aria-label={t('levels.req.move_down', lang)}
                  className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  {r.displayLabel}
                  {r.materialType && (
                    <span className="rounded-full bg-indigo-royal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-royal-700">
                      {t(`levels.materials.type.${r.materialType}`, lang)}
                    </span>
                  )}
                </p>
                {r.displayDescription && (
                  <p className="mt-0.5 text-xs text-body">
                    {r.displayDescription}
                  </p>
                )}
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    // noreferrer as well as noopener: these links are
                    // admin-entered and point off-site.
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-royal-700 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    {r.url}
                  </a>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDraft({
                      id: r.id,
                      label: r.label,
                      description: r.description ?? '',
                      materialType: r.materialType ?? 'book',
                      url: r.url ?? '',
                    });
                  }}
                  aria-label={t('levels.req.edit', lang)}
                  className="rounded p-1 text-muted hover:text-ink"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDeleting(r);
                  }}
                  aria-label={t('levels.req.delete', lang)}
                  className="rounded p-1 text-muted hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <Modal
          titleId={`req-form-${type}`}
          title={t(draft.id ? `${ns}.edit_title` : `${ns}.add_title`, lang)}
          onClose={() => !pending && setDraft(null)}
        >
          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor={`req-label-${type}`}>
                {t(`${ns}.label`, lang)}
              </label>
              <input
                id={`req-label-${type}`}
                className="input"
                maxLength={120}
                value={draft.label}
                placeholder={t(`${ns}.placeholder`, lang)}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </div>

            {type === 'material' && (
              <>
                <div>
                  <label className="label" htmlFor="req-material-type">
                    {t('levels.materials.type_label', lang)}
                  </label>
                  <select
                    id="req-material-type"
                    className="input"
                    value={draft.materialType}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        materialType: e.target.value as MaterialType,
                      })
                    }
                  >
                    {MATERIAL_TYPES.map((m) => (
                      <option key={m} value={m}>
                        {t(`levels.materials.type.${m}`, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="req-url">
                    {t('levels.materials.url_label', lang)}
                  </label>
                  <input
                    id="req-url"
                    type="url"
                    className="input"
                    maxLength={500}
                    value={draft.url}
                    placeholder={t('levels.materials.url_placeholder', lang)}
                    onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <label className="label" htmlFor={`req-desc-${type}`}>
                {t('levels.req.description_label', lang)}
              </label>
              <textarea
                id={`req-desc-${type}`}
                className="input"
                rows={3}
                maxLength={500}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <ModalActions
            lang={lang}
            pending={pending}
            disabled={!draft.label.trim()}
            onCancel={() => setDraft(null)}
            onConfirm={() => {
              const payload = {
                type,
                levelDefinitionId,
                label: draft.label,
                description: draft.description,
                ...(type === 'material'
                  ? { materialType: draft.materialType, url: draft.url }
                  : {}),
              };
              run(
                () =>
                  draft.id
                    ? updateRequirement({ ...payload, id: draft.id })
                    : createRequirement(payload),
                () => setDraft(null),
              );
            }}
            confirmLabel={t('levels.req.save', lang)}
            confirmClass="btn-primary"
          />
        </Modal>
      )}

      {deleting && (
        <Modal
          titleId={`req-delete-${type}`}
          title={t('levels.req.delete_title', lang)}
          onClose={() => !pending && setDeleting(null)}
        >
          <p className="mt-2 text-sm text-body">
            {t('levels.req.delete_body', lang).replace(
              '{name}',
              deleting.displayLabel,
            )}
          </p>
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <ModalActions
            lang={lang}
            pending={pending}
            onCancel={() => setDeleting(null)}
            onConfirm={() =>
              run(
                () => deleteRequirement(type, deleting.id),
                () => setDeleting(null),
              )
            }
            confirmLabel={t('levels.req.delete_confirm', lang)}
            confirmClass="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          />
        </Modal>
      )}
    </section>
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
        {t('levels.req.cancel', lang)}
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
