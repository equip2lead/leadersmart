'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, Undo2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { initialsOf, levelTone } from '@/lib/leaders';
import { MAX_REVIEWER_COMMENT } from '@/lib/assignment-limits';
import type { AppLanguage, AssignmentResponseStatus } from '@/lib/types';
import {
  reviewAssignmentResponse,
  sendBackForRevision,
} from '../assignment-actions';

export type TabKey = 'pending' | 'reviewed' | 'all';

export type SubmissionRow = {
  id: string;
  leaderDevelopmentId: string;
  materialId: string;
  leaderName: string;
  level: number;
  materialTitle: string;
  status: AssignmentResponseStatus;
  version: number;
  submittedAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  reviewerComment: string | null;
  responseText: string;
};

const PREVIEW_LENGTH = 200;

function mapError(code: string, lang: AppLanguage): string {
  const key = `submissions.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

function formatDate(iso: string, lang: AppLanguage): string {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH)}…` : flat;
}

/** The review form for one row. Kept as its own component so each open row
    owns its own comment draft — a single shared draft would follow the mentor
    from one leader's response into the next. */
function ReviewForm({
  lang,
  row,
  onDone,
}: {
  lang: AppLanguage;
  row: SubmissionRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tooLong = comment.length > MAX_REVIEWER_COMMENT;

  function act(action: (id: string, c: string) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action(row.id, comment);
      if (!res.ok) {
        setError(mapError(res.error ?? 'not_allowed', lang));
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-4 py-3 text-sm leading-relaxed text-body">
        {row.responseText}
      </p>

      <div className="mt-4">
        <label className="label" htmlFor={`comment-${row.id}`}>
          {t('submissions.reviewer_comment_label', lang)}
        </label>
        <textarea
          id={`comment-${row.id}`}
          className="input min-h-[110px]"
          value={comment}
          disabled={pending}
          placeholder={t('submissions.reviewer_comment_placeholder', lang)}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-muted">
          {t('submissions.reviewer_comment_required', lang)}
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || tooLong}
          onClick={() => act(reviewAssignmentResponse)}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t('submissions.approve_button', lang)}
        </button>
        <button
          type="button"
          className="btn-secondary"
          // Disabled without a comment rather than failing on click: the rule
          // is a property of the button, so it should be visible before the
          // mentor commits to pressing it.
          disabled={pending || tooLong || comment.trim().length === 0}
          onClick={() => act(sendBackForRevision)}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          {t('submissions.send_back_button', lang)}
        </button>
        <button
          type="button"
          className="ml-auto text-sm font-medium text-muted hover:text-ink"
          disabled={pending}
          onClick={onDone}
        >
          {t('submissions.close_button', lang)}
        </button>
      </div>
    </div>
  );
}

export function SubmissionsBoard({
  lang,
  tab,
  rows,
  pendingCount,
}: {
  lang: AppLanguage;
  tab: TabKey;
  rows: SubmissionRow[];
  pendingCount: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = [
    {
      key: 'pending',
      label: t('submissions.tab_pending', lang),
      badge: pendingCount,
    },
    { key: 'reviewed', label: t('submissions.tab_reviewed', lang) },
    { key: 'all', label: t('submissions.tab_all', lang) },
  ];

  return (
    <div>
      {/* Links, not buttons: the tab is a server-side filter, so it belongs in
          the URL where it can be shared and reloaded. */}
      <nav className="flex flex-wrap gap-1 border-b border-gray-200">
        {tabs.map((item) => {
          const active = item.key === tab;
          return (
            <Link
              key={item.key}
              href={`/admin/leaders/submissions?tab=${item.key}`}
              aria-current={active ? 'page' : undefined}
              className={
                '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition ' +
                (active
                  ? 'border-indigo-royal-700 text-indigo-royal-700'
                  : 'border-transparent text-muted hover:text-ink')
              }
            >
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="rounded-full bg-gold-warm-100 px-1.5 py-0.5 text-[10px] font-bold text-gold-warm-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="text-sm text-body">
            {t(
              tab === 'pending'
                ? 'submissions.empty_pending'
                : tab === 'reviewed'
                  ? 'submissions.empty_reviewed'
                  : 'submissions.empty_all',
              lang,
            )}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const open = openId === row.id;
            return (
              <li
                key={row.id}
                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className={
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
                      levelTone(row.level)
                    }
                    aria-hidden="true"
                  >
                    {initialsOf(row.leaderName)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{row.leaderName}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-indigo-royal-50 px-2 py-0.5 font-bold text-indigo-royal-700">
                        {t('lesson.level_badge', lang).replace(
                          '{level}',
                          String(row.level),
                        )}
                      </span>
                      {/* Opens the lesson at this submission's own material,
                          which is where the mentor can see the prompt the
                          leader was answering. */}
                      <Link
                        href={`/admin/leaders/${row.leaderDevelopmentId}/lesson/${row.materialId}`}
                        className="inline-flex items-center gap-1 font-medium text-indigo-royal-700 hover:underline"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        {row.materialTitle}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t('lesson.submitted_at', lang).replace(
                        '{date}',
                        formatDate(row.submittedAt, lang),
                      )}
                      {' · '}
                      {t('lesson.version_label', lang).replace(
                        '{version}',
                        String(row.version),
                      )}
                    </p>
                    {!open && (
                      <p className="mt-2 text-sm leading-relaxed text-body">
                        {preview(row.responseText)}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {row.status === 'reviewed' ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {t('lesson.status_reviewed', lang)}
                      </span>
                    ) : (
                      <span className="rounded-full border border-gold-warm-200 bg-gold-warm-50 px-3 py-1 text-xs font-semibold text-gold-warm-700">
                        {t('lesson.status_submitted', lang)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : row.id)}
                    >
                      {open
                        ? t('submissions.close_button', lang)
                        : t('submissions.review_button', lang)}
                    </button>
                  </div>
                </div>

                {/* Already-reviewed rows show the verdict instead of the form.
                    Re-reviewing is not a thing: the response is frozen, and a
                    new verdict needs a new submission to attach to. */}
                {open && row.status === 'reviewed' && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-4 py-3 text-sm leading-relaxed text-body">
                      {row.responseText}
                    </p>
                    <div className="mt-4 rounded-lg border border-indigo-royal-200 bg-indigo-royal-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-indigo-royal-700">
                        {t('lesson.reviewer_comment_label', lang)}
                      </p>
                      {row.reviewerComment && (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                          {row.reviewerComment}
                        </p>
                      )}
                      {row.reviewedAt && (
                        <p className="mt-2 text-xs text-indigo-royal-700">
                          {t('submissions.reviewed_by', lang)
                            .replace('{name}', row.reviewerName ?? '—')
                            .replace('{date}', formatDate(row.reviewedAt, lang))}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {open && row.status === 'submitted' && (
                  <ReviewForm lang={lang} row={row} onDone={() => setOpenId(null)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
