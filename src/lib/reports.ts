import { t } from './i18n';
import type { AppLanguage, ReportStatus } from './types';

// Shared by the reports pages and the dashboard panel so status colour
// and month formatting can't drift between them.

/** First day of the given month, as the `date` column stores it. */
export function monthStart(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function currentMonthStart(): string {
  return monthStart(new Date());
}

// Current month plus the previous three. A branch that missed a month
// should still be able to file it, but reporting is monthly — an
// unbounded back-catalogue would just be a data-entry hazard.
export function eligibleMonths(count = 4): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return monthStart(d);
  });
}

export function formatMonth(isoDate: string, lang: AppLanguage): string {
  // Parse as UTC noon so a timezone west of UTC can't roll the date back
  // into the previous month.
  const [y, m] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 12)).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-US',
    { year: 'numeric', month: 'long', timeZone: 'UTC' },
  );
}

export function formatDate(iso: string, lang: AppLanguage): string {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// `pending` isn't a stored status — it's the dashboard's word for a
// branch with no report yet this month.
export type DisplayStatus = ReportStatus | 'pending';

const STATUS_CLASS: Record<DisplayStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-600 text-white',
  needs_review: 'bg-gold-warm-100 text-gold-warm-700',
  pending: 'bg-gray-100 text-muted',
};

export function statusClass(status: DisplayStatus): string {
  return STATUS_CLASS[status];
}

export function statusLabel(status: DisplayStatus, lang: AppLanguage): string {
  return t(`reports.status.${status}`, lang);
}
