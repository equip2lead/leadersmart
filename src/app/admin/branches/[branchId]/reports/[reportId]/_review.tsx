'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { approveReport, sendReportBackForReview } from '../actions';
import { ConfirmModal } from '../_list';

function mapError(code: string, lang: AppLanguage): string {
  const key = `reports.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

// HQ's two verdicts on a submitted report. Owner-only — the server
// actions enforce that independently, since RLS cannot tell an approval
// from a draft save.
export function ReviewActions({
  lang,
  reportId,
}: {
  lang: AppLanguage;
  reportId: string;
}) {
  const router = useRouter();
  const [sendingBack, setSendingBack] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await approveReport(reportId);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.refresh();
    });
  }

  function sendBack() {
    setError(null);
    startTransition(async () => {
      const res = await sendReportBackForReview(reportId, comment);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setSendingBack(false);
      router.refresh();
    });
  }

  return (
    <>
      {error && !sendingBack && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setComment('');
            setSendingBack(true);
          }}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold-warm-300 bg-gold-warm-50 px-5 py-3 text-sm font-semibold text-gold-warm-700 transition hover:bg-gold-warm-100 disabled:opacity-50"
        >
          {t('reports.detail.send_back', lang)}
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? t('common.loading', lang) : t('reports.detail.approve', lang)}
        </button>
      </div>

      {sendingBack && (
        <ConfirmModal
          lang={lang}
          pending={pending}
          destructive={false}
          title={t('reports.detail.send_back_title', lang)}
          error={error}
          confirmLabel={t('reports.detail.send_back', lang)}
          // A send-back with no explanation leaves the branch guessing;
          // the action rejects it too.
          confirmDisabled={!comment.trim()}
          onCancel={() => setSendingBack(false)}
          onConfirm={sendBack}
        >
          <div className="mt-4">
            <label className="label" htmlFor="reviewer-comment">
              {t('reports.detail.reviewer_comment_label', lang)}
            </label>
            <textarea
              id="reviewer-comment"
              className="input"
              rows={4}
              maxLength={1000}
              value={comment}
              placeholder={t(
                'reports.detail.reviewer_comment_placeholder',
                lang,
              )}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </ConfirmModal>
      )}
    </>
  );
}
