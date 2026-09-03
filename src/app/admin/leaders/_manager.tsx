'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { LEADER_LEVELS, MAX_LEADER_LEVEL } from '@/lib/types';
import type { AppLanguage } from '@/lib/types';
import {
  formatStartedDate,
  initialsOf,
  levelPercent,
  levelTone,
} from '@/lib/leaders';
import {
  addLeader,
  deleteLeader,
  setLeaderActive,
  updateLeaderLevel,
} from './actions';

// Pipeline row joined to its person. The join happens on the server so
// this component never needs a second lookup to render a name.
export type LeaderRow = {
  id: string;
  userId: string;
  name: string;
  level: number;
  startedAt: string;
  isActive: boolean;
  notes: string | null;
};

export type EligibleUser = { id: string; name: string; roleLabel: string };

function mapError(code: string, lang: AppLanguage): string {
  const key = `leaders.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

export function LeadersManager({
  lang,
  leaders,
  eligible,
  canDelete,
}: {
  lang: AppLanguage;
  leaders: LeaderRow[];
  /** Church members not already in the pipeline — the unique pair means
      offering someone twice would only produce an error. */
  eligible: EligibleUser[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [levelFor, setLevelFor] = useState<LeaderRow | null>(null);
  const [deactivating, setDeactivating] = useState<LeaderRow | null>(null);
  const [deleting, setDeleting] = useState<LeaderRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [userId, setUserId] = useState('');
  const [startLevel, setStartLevel] = useState(1);
  const [notes, setNotes] = useState('');

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
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setUserId('');
            setStartLevel(1);
            setNotes('');
            setAdding(true);
          }}
          disabled={eligible.length === 0}
          title={
            eligible.length === 0
              ? t('leaders.form.no_eligible_users', lang)
              : undefined
          }
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('leaders.add_button', lang)}
        </button>
      </div>

      {error && !adding && !levelFor && !deactivating && !deleting && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {leaders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Sparkles
            className="mx-auto h-10 w-10 text-indigo-royal-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="mt-4 text-lg font-bold text-ink">
            {t('leaders.empty_title', lang)}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-body">
            {t('leaders.empty_body', lang)}
          </p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={eligible.length === 0}
            className="btn-primary mt-6 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('leaders.add_button', lang)}
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 lg:grid-cols-2">
          {leaders.map((l) => (
            <li
              key={l.id}
              className={
                'rounded-lg border p-4 ' +
                (l.isActive
                  ? 'border-gray-200 bg-white'
                  : 'border-gray-200 bg-gray-50 opacity-75')
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
                    levelTone(l.level)
                  }
                  aria-hidden="true"
                >
                  {initialsOf(l.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-ink">
                      <Link
                        href={`/admin/leaders/${l.id}`}
                        className="hover:text-indigo-royal-700 hover:underline"
                      >
                        {l.name}
                      </Link>
                    </p>
                    {!l.isActive && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        {t('leaders.card.inactive_badge', lang)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {t('leaders.card.started', lang).replace(
                      '{date}',
                      formatStartedDate(l.startedAt, lang),
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs font-semibold text-body">
                {t('leaders.card.level_of_total', lang)
                  .replace('{level}', String(l.level))
                  .replace('{total}', String(MAX_LEADER_LEVEL))}
              </p>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
                aria-valuenow={l.level}
                aria-valuemin={1}
                aria-valuemax={MAX_LEADER_LEVEL}
              >
                <div
                  className="h-full rounded-full bg-indigo-royal-700"
                  style={{ width: `${levelPercent(l.level)}%` }}
                />
              </div>

              {l.notes && <p className="mt-3 text-xs text-body">{l.notes}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setLevelFor(l);
                  }}
                  className="text-sm font-medium text-body hover:text-ink"
                >
                  {t('leaders.card.change_level', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    if (l.isActive) setDeactivating(l);
                    else run(() => setLeaderActive(l.id, true), () => {});
                  }}
                  disabled={pending}
                  className="text-sm font-medium text-muted hover:text-ink"
                >
                  {t(
                    l.isActive ? 'leaders.card.deactivate' : 'leaders.card.reactivate',
                    lang,
                  )}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDeleting(l);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('leaders.card.delete', lang)}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <Modal
          titleId="leader-add-title"
          title={t('leaders.add_title', lang)}
          onClose={() => !pending && setAdding(false)}
        >
          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="leader-user">
                {t('leaders.form.user_label', lang)}
              </label>
              <select
                id="leader-user"
                className="input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">{t('leaders.form.user_placeholder', lang)}</option>
                {eligible.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.roleLabel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="leader-level">
                {t('leaders.form.level_label', lang)}
              </label>
              <select
                id="leader-level"
                className="input"
                value={startLevel}
                onChange={(e) => setStartLevel(Number(e.target.value))}
              >
                {LEADER_LEVELS.map((n) => (
                  <option key={n} value={n}>
                    {t('leaders.level_name', lang).replace('{level}', String(n))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="leader-notes">
                {t('leaders.form.notes_label', lang)}
              </label>
              <textarea
                id="leader-notes"
                className="input"
                rows={3}
                maxLength={500}
                value={notes}
                placeholder={t('leaders.form.notes_placeholder', lang)}
                onChange={(e) => setNotes(e.target.value)}
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
            disabled={!userId}
            onCancel={() => setAdding(false)}
            onConfirm={() =>
              run(
                () => addLeader({ userId, startingLevel: startLevel, notes }),
                () => setAdding(false),
              )
            }
            confirmLabel={t('leaders.form.save', lang)}
            confirmClass="btn-primary"
          />
        </Modal>
      )}

      {levelFor && (
        <Modal
          titleId="leader-level-title"
          title={t('leaders.change_level_title', lang)}
          onClose={() => !pending && setLevelFor(null)}
        >
          <p className="mt-2 text-sm text-body">{levelFor.name}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LEADER_LEVELS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={pending}
                aria-current={n === levelFor.level}
                onClick={() =>
                  run(
                    () => updateLeaderLevel(levelFor.id, n),
                    () => setLevelFor(null),
                  )
                }
                className={
                  'rounded-lg border px-4 py-2 text-sm font-semibold transition ' +
                  (n === levelFor.level
                    ? 'border-indigo-royal-700 bg-indigo-royal-700 text-white'
                    : 'border-gray-200 bg-white text-body hover:border-indigo-royal-300')
                }
              >
                {t('leaders.level_name', lang).replace('{level}', String(n))}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </Modal>
      )}

      {deactivating && (
        <Modal
          titleId="leader-deactivate-title"
          title={t('leaders.deactivate_title', lang)}
          onClose={() => !pending && setDeactivating(null)}
        >
          <p className="mt-2 text-sm text-body">
            {t('leaders.deactivate_body', lang).replace('{name}', deactivating.name)}
          </p>
          <ModalActions
            lang={lang}
            pending={pending}
            onCancel={() => setDeactivating(null)}
            onConfirm={() =>
              run(
                () => setLeaderActive(deactivating.id, false),
                () => setDeactivating(null),
              )
            }
            confirmLabel={t('leaders.deactivate_confirm', lang)}
            confirmClass="btn-primary"
          />
        </Modal>
      )}

      {deleting && (
        <Modal
          titleId="leader-delete-title"
          title={t('leaders.delete_title', lang)}
          onClose={() => !pending && setDeleting(null)}
        >
          <p className="mt-2 text-sm text-body">
            {t('leaders.delete_body', lang).replace('{name}', deleting.name)}
          </p>
          <ModalActions
            lang={lang}
            pending={pending}
            onCancel={() => setDeleting(null)}
            onConfirm={() =>
              run(() => deleteLeader(deleting.id), () => setDeleting(null))
            }
            confirmLabel={t('leaders.delete_confirm', lang)}
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
        {t('leaders.form.cancel', lang)}
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
