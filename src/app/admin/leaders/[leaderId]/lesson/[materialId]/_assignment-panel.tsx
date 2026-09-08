'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, MessageSquareQuote, PencilLine } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, AssignmentResponse } from '@/lib/types';
import { MAX_RESPONSE_LENGTH } from '@/lib/assignment-limits';
import {
  saveAssignmentDraft,
  submitAssignmentResponse,
} from '../../../assignment-actions';

// The assignment side of the lesson. Sticky on desktop so the prompt stays in
// view while the leader reads, stacked underneath the lesson on mobile.

function mapError(code: string, lang: AppLanguage): string {
  const key = `lesson.err.${code}`;
  const translated = t(key, lang);
  // Unmapped codes are raw Postgres messages. Showing one is ugly but honest;
  // swallowing it would leave a button that silently does nothing.
  return translated === key ? code : translated;
}

function formatDate(iso: string, lang: AppLanguage): string {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AssignmentPanel({
  lang,
  leaderDevelopmentId,
  materialId,
  prompt,
  initial,
  /** Mentors can read a leader's answer but never write one in their name. */
  canWrite,
}: {
  lang: AppLanguage;
  leaderDevelopmentId: string;
  materialId: string;
  prompt: string | null;
  initial: AssignmentResponse | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [response, setResponse] = useState<AssignmentResponse | null>(initial);
  const [text, setText] = useState(initial?.response_text ?? '');
  // Revising is a client-side intent, not a stored state: the submitted row
  // stays frozen until the leader actually saves, and saving creates the next
  // version. Until then, nothing has happened.
  const [revising, setRevising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const status = response?.status ?? null;
  const locked = status === 'submitted' || status === 'reviewed';
  const editable = canWrite && (!locked || revising);
  const overLimit = text.length > MAX_RESPONSE_LENGTH;

  function run(
    action: (
      ld: string,
      mat: string,
      body: string,
    ) => Promise<
      { ok: true; response: AssignmentResponse } | { ok: false; error: string }
    >,
  ) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await action(leaderDevelopmentId, materialId, text);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setResponse(res.response);
      setRevising(false);
      setSaved(true);
      // The lesson header carries the same status pill, so the server
      // component has to catch up too.
      router.refresh();
    });
  }

  if (!prompt) {
    return (
      <aside className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-muted">
        {t('lesson.no_assignment', lang)}
      </aside>
    );
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      {/* Mentor feedback leads the panel when it exists — it is the most
          recent thing that happened, and the reason to be back on this page. */}
      {response?.status === 'reviewed' && (
        <div className="rounded-xl border border-indigo-royal-200 bg-indigo-royal-50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-royal-700">
            <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" />
            {t('lesson.reviewer_comment_label', lang)}
          </p>
          {response.reviewer_comment ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {response.reviewer_comment}
            </p>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-indigo-royal-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t('lesson.status_reviewed', lang)}
            </p>
          )}
          {response.reviewed_at && (
            <p className="mt-2 text-xs text-indigo-royal-700">
              {t('lesson.reviewed_at', lang).replace(
                '{date}',
                formatDate(response.reviewed_at, lang),
              )}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-yellow-800">
          {t('lesson.assignment_prompt_label', lang)}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {prompt}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <label className="label" htmlFor="assignment-response">
          {t('lesson.your_response_label', lang)}
        </label>
        <textarea
          id="assignment-response"
          className="input min-h-[220px] leading-relaxed"
          value={text}
          readOnly={!editable}
          disabled={pending}
          placeholder={t('lesson.response_placeholder', lang)}
          onChange={(e) => setText(e.target.value)}
        />

        <p
          className={
            'mt-1.5 text-xs ' + (overLimit ? 'font-semibold text-red-600' : 'text-muted')
          }
          // Announced only once the writer is actually over — a counter that
          // speaks on every keystroke is unusable with a screen reader.
          aria-live={overLimit ? 'polite' : 'off'}
        >
          {t(overLimit ? 'lesson.char_over' : 'lesson.char_counter', lang)
            .replace('{count}', String(text.length))
            .replace('{max}', String(MAX_RESPONSE_LENGTH))}
        </p>

        {locked && !revising && (
          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-body">
              <Clock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              {t('lesson.submitted_at', lang).replace(
                '{date}',
                formatDate(response!.submitted_at, lang),
              )}
              <span className="text-muted">
                ·{' '}
                {t('lesson.version_label', lang).replace(
                  '{version}',
                  String(response!.version),
                )}
              </span>
            </p>
            <p className="text-xs text-muted">{t('lesson.readonly_notice', lang)}</p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mt-3 text-sm font-medium text-emerald-700">
            {response?.status === 'draft'
              ? t('lesson.draft_saved', lang)
              : t('lesson.awaiting_review', lang)}
          </p>
        )}

        {canWrite && (
          <div className="mt-4 flex flex-wrap gap-2">
            {editable ? (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={pending || overLimit || text.trim().length === 0}
                  onClick={() => run(saveAssignmentDraft)}
                >
                  {t('lesson.save_draft', lang)}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pending || overLimit || text.trim().length === 0}
                  onClick={() => run(submitAssignmentResponse)}
                >
                  {t('lesson.submit_for_review', lang)}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setRevising(true);
                  setSaved(false);
                }}
              >
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                {t('lesson.revise_and_resubmit', lang)}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
