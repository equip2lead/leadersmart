import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { t } from '@/lib/i18n';
import { statusClass, statusLabel, type DisplayStatus } from '@/lib/reports';
import type { AppLanguage } from '@/lib/types';

export function StatusBadge({
  status,
  lang,
}: {
  status: DisplayStatus;
  lang: AppLanguage;
}) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
        statusClass(status)
      }
    >
      {statusLabel(status, lang)}
    </span>
  );
}

export function ReportsBreadcrumb({
  lang,
  branchId,
  branchName,
  trailing,
}: {
  lang: AppLanguage;
  branchId: string;
  branchName: string;
  /** Final crumb, when the page is deeper than the reports list. */
  trailing?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted"
    >
      <Link href="/admin/branches" className="hover:text-ink hover:underline">
        {t('zones.breadcrumb_branches', lang)}
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="truncate text-body">{branchName}</span>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      {trailing ? (
        <>
          <Link
            href={`/admin/branches/${branchId}/reports`}
            className="hover:text-ink hover:underline"
          >
            {t('reports.breadcrumb', lang)}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-current="page" className="text-ink">
            {trailing}
          </span>
        </>
      ) : (
        <span aria-current="page" className="text-ink">
          {t('reports.breadcrumb', lang)}
        </span>
      )}
    </nav>
  );
}
