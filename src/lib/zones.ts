import { t } from './i18n';
import type { AppLanguage } from './types';

// Zone counts per branch, for the branch cards on /admin and
// /admin/branches. Supabase's JS client has no GROUP BY, so the ids are
// fetched and tallied here — zone volumes are small (a branch has a
// handful of regions), so this stays cheaper than a count query per card.
export function tallyByBranch(
  rows: Array<{ branch_id: string }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.branch_id] = (out[r.branch_id] ?? 0) + 1;
  return out;
}

// French takes the singular for zero ("0 zone"), English the plural
// ("0 zones"), so the three cases are separate keys rather than one
// string with an appended "s".
export function zoneCountLabel(count: number, lang: AppLanguage): string {
  if (count === 0) return t('zones.count_none', lang);
  if (count === 1) return t('zones.count_singular', lang);
  return t('zones.count_label', lang).replace('{count}', String(count));
}
