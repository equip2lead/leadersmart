'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { purgeAllTestData } from './actions';

export type TestDataRow = { table: string; rows: number };

export function PurgePanel({
  lang,
  summary,
}: {
  lang: AppLanguage;
  summary: TestDataRow[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = summary.reduce((sum, r) => sum + r.rows, 0);

  function fill(key: string, values: Record<string, string>): string {
    return Object.entries(values).reduce(
      (out, [k, v]) => out.replace(`{${k}}`, v),
      t(key, lang),
    );
  }

  function purge() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await purgeAllTestData();
      if (!res.ok) {
        setError(t('admin.test_data.error', lang));
        return;
      }
      setConfirming(false);
      // The table count comes from what the function reported, not a literal.
      // A purge that gains a table should not need this string edited.
      setNotice(
        fill('admin.test_data.success_toast', {
          total: String(res.total),
          tables: String(res.tables),
        }),
      );
      router.refresh();
    });
  }

  return (
    <section className="card mt-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-royal-50 text-indigo-royal-700">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">
            {t('admin.test_data.title', lang)}
          </h2>
          <p className="mt-0.5 text-sm text-body">
            {t('admin.test_data.subtitle', lang)}
          </p>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Nothing to offer once a tenant is running on real data, so the whole
          control disappears rather than sitting there greyed out. */}
      {total === 0 ? (
        <p className="mt-4 text-sm text-muted">{t('admin.test_data.none', lang)}</p>
      ) : (
        <>
          <p className="mt-4 text-sm font-medium text-ink">
            {fill('admin.test_data.summary_line', {
              total: String(total),
              tables: String(summary.length),
            })}
          </p>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {summary.map((r) => (
              <li
                key={r.table}
                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-xs text-body"
              >
                {r.table} · {r.rows}
              </li>
            ))}
          </ul>

          {!confirming ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {t('admin.test_data.remove_button', lang)}
            </button>
          ) : (
            <div
              role="alertdialog"
              aria-label={t('admin.test_data.confirm_modal_title', lang)}
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <p className="text-sm font-semibold text-ink">
                {t('admin.test_data.confirm_modal_title', lang)}
              </p>
              <p className="mt-1.5 text-sm text-body">
                {t('admin.test_data.confirm_modal_body', lang)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={purge}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {pending
                    ? t('common.loading', lang)
                    : t('admin.test_data.confirm_delete', lang)}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className="text-sm font-medium text-muted hover:text-ink"
                >
                  {t('common.cancel', lang)}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
