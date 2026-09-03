'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n';
import { formatDate, statusClass, statusLabel } from '@/lib/reports';
import type { AppLanguage, ReportStatus } from '@/lib/types';
import { deleteReport } from './actions';

export type ReportRow = {
  id: string;
  month: string;
  monthLabel: string;
  status: ReportStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
};

function mapError(code: string, lang: AppLanguage): string {
  const key = `reports.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

export function ReportsList({
  lang,
  branchId,
  branchName,
  rows,
  canDelete,
}: {
  lang: AppLanguage;
  branchId: string;
  branchName: string;
  rows: ReportRow[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<ReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteReport(deleting.id);
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-8">
      {error && !deleting && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                <Link
                  href={`/admin/branches/${branchId}/reports/${r.id}`}
                  className="hover:text-indigo-royal-700 hover:underline"
                >
                  {r.monthLabel}
                </Link>
                <span
                  className={
                    'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                    statusClass(r.status)
                  }
                >
                  {statusLabel(r.status, lang)}
                </span>
              </p>
              {(r.submittedAt || r.reviewedAt) && (
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
                  {r.submittedAt && (
                    <span>
                      {t('reports.status.submitted', lang)} ·{' '}
                      {formatDate(r.submittedAt, lang)}
                    </span>
                  )}
                  {r.reviewedAt && (
                    <span>
                      {t('reports.status.approved', lang)} ·{' '}
                      {formatDate(r.reviewedAt, lang)}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <Link
                href={`/admin/branches/${branchId}/reports/${r.id}`}
                className="text-sm font-medium text-body hover:text-ink"
              >
                {t(
                  r.status === 'draft' || r.status === 'needs_review'
                    ? 'reports.detail.edit'
                    : 'reports.detail.view',
                  lang,
                )}
              </Link>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDeleting(r);
                  }}
                  aria-label={t('reports.detail.delete', lang)}
                  className="rounded p-1 text-muted hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {deleting && (
        <ConfirmModal
          lang={lang}
          pending={pending}
          title={t('reports.delete_title', lang)}
          body={t('reports.delete_body', lang)
            .replace('{month}', deleting.monthLabel)
            .replace('{branch_name}', branchName)}
          error={error}
          confirmLabel={t('reports.delete_confirm', lang)}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

export function ConfirmModal({
  lang,
  pending,
  title,
  body,
  error,
  confirmLabel,
  onCancel,
  onConfirm,
  children,
  confirmDisabled = false,
  destructive = true,
}: {
  lang: AppLanguage;
  pending: boolean;
  title: string;
  body?: string;
  error?: string | null;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
  destructive?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/40 p-4"
      onClick={() => !pending && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="report-modal-title" className="text-lg font-bold text-ink">
          {title}
        </h2>
        {body && <p className="mt-2 text-sm text-body">{body}</p>}
        {children}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
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
            disabled={pending || confirmDisabled}
            className={
              destructive
                ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50'
                : 'btn-primary'
            }
          >
            {pending ? t('common.loading', lang) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
