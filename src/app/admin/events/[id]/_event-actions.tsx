'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Pencil, Send, Trash2, XCircle } from 'lucide-react';
import { t } from '@/lib/i18n';
import { MAX_EVENT_NOTES } from '@/lib/events';
import type { AppLanguage, EventStatus } from '@/lib/types';
import {
  cancelEvent,
  deleteEvent,
  markEventCompleted,
  publishEvent,
  updateEventNotes,
} from '../actions';

// The admin-only controls on the event detail page: status transitions, the
// completion note, and delete. Rendered only for owner/admin_pastor — the page
// decides that, and RLS refuses anything that slips through.

function mapError(code: string, lang: AppLanguage): string {
  const key = `events.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

/** A small inline confirm, used for both destructive verbs.
    Inline rather than window.confirm(): a native dialog blocks the page and
    cannot be translated. */
function Confirm({
  lang,
  message,
  confirmLabel,
  destructive,
  pending,
  onConfirm,
  onDismiss,
}: {
  lang: AppLanguage;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={message}
      className="rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className={
            'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ' +
            (destructive
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-indigo-royal-700 hover:bg-indigo-royal-800')
          }
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDismiss}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          {t('events.detail.keep', lang)}
        </button>
      </div>
    </div>
  );
}

export function EventActions({
  lang,
  eventId,
  status,
  canDelete,
  postEventNotes,
}: {
  lang: AppLanguage;
  eventId: string;
  status: EventStatus;
  /** Owner only — matches the events_delete policy. */
  canDelete: boolean;
  postEventNotes: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'complete' | 'cancel' | 'delete' | 'notes'>(
    'idle',
  );
  const [notes, setNotes] = useState(postEventNotes ?? '');

  const overNotes = notes.length > MAX_EVENT_NOTES;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, redirectTo?: string) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(mapError(res.error ?? 'not_admin', lang));
        return;
      }
      setMode('idle');
      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {mode === 'complete' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-ink">
            {t('events.detail.mark_completed_modal_title', lang)}
          </p>
          <p className="mt-1 text-sm text-body">
            {t('events.detail.mark_completed_modal_body', lang)}
          </p>
          <textarea
            className="input mt-3 min-h-[120px]"
            value={notes}
            disabled={pending}
            onChange={(e) => setNotes(e.target.value)}
          />
          {overNotes && (
            <p className="mt-1.5 text-xs font-semibold text-red-600">
              {t('events.err.notes_too_long', lang)}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={pending || overNotes}
              onClick={() => run(() => markEventCompleted(eventId, notes))}
            >
              {t('events.detail.mark_completed', lang)}
            </button>
            <button
              type="button"
              className="text-sm font-medium text-muted hover:text-ink"
              disabled={pending}
              onClick={() => setMode('idle')}
            >
              {t('events.form.cancel', lang)}
            </button>
          </div>
        </div>
      )}

      {mode === 'notes' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <label className="label" htmlFor="event-notes">
            {t('events.detail.post_notes_label', lang)}
          </label>
          <textarea
            id="event-notes"
            className="input min-h-[120px]"
            value={notes}
            disabled={pending}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={pending || overNotes}
              onClick={() => run(() => updateEventNotes(eventId, notes))}
            >
              {t('events.detail.post_notes_save', lang)}
            </button>
            <button
              type="button"
              className="text-sm font-medium text-muted hover:text-ink"
              disabled={pending}
              onClick={() => {
                setNotes(postEventNotes ?? '');
                setMode('idle');
              }}
            >
              {t('events.form.cancel', lang)}
            </button>
          </div>
        </div>
      )}

      {mode === 'cancel' && (
        <Confirm
          lang={lang}
          message={t('events.detail.confirm_cancel', lang)}
          confirmLabel={t('events.detail.cancel_event', lang)}
          pending={pending}
          onConfirm={() => run(() => cancelEvent(eventId))}
          onDismiss={() => setMode('idle')}
        />
      )}

      {mode === 'delete' && (
        <Confirm
          lang={lang}
          message={t('events.detail.confirm_delete', lang)}
          confirmLabel={t('events.detail.delete', lang)}
          destructive
          pending={pending}
          onConfirm={() => run(() => deleteEvent(eventId), '/admin/events')}
          onDismiss={() => setMode('idle')}
        />
      )}

      {mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          {status === 'draft' && (
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => run(() => publishEvent(eventId))}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {t('events.detail.publish', lang)}
            </button>
          )}

          {status === 'published' && (
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={() => setMode('complete')}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t('events.detail.mark_completed', lang)}
            </button>
          )}

          {status === 'completed' && (
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() => setMode('notes')}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t('events.detail.post_notes_label', lang)}
            </button>
          )}

          {/* Editing a cancelled event is pointless, so the link goes with the
              other verbs once it is cancelled. */}
          {status !== 'cancelled' && (
            <Link href={`/admin/events/${eventId}/edit`} className="btn-secondary">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t('events.detail.edit', lang)}
            </Link>
          )}

          {(status === 'draft' || status === 'published' || status === 'completed') && (
            <button
              type="button"
              className="btn-secondary !text-red-700"
              disabled={pending}
              onClick={() => setMode('cancel')}
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {t('events.detail.cancel_event', lang)}
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-red-700"
              disabled={pending}
              onClick={() => setMode('delete')}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('events.detail.delete', lang)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
