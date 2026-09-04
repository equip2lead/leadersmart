import { t } from './i18n';
import { MAX_LEADER_LEVEL } from './types';
import type { AppLanguage } from './types';

// Shared between /admin/leaders and the ministry dashboard so the two
// surfaces can't disagree about what a level looks like.

// Leadership level content is author-written and lives in its own _fr
// columns rather than the i18n dictionary, so it needs its own picker.
// Falls back to English whenever the translation is missing or blank —
// content a church adds itself has no French, and a blank cell would be
// worse than an untranslated one.
export function pickLang(
  en: string | null,
  fr: string | null,
  lang: AppLanguage,
): string | null {
  if (lang === 'fr' && fr && fr.trim()) return fr;
  return en;
}

/** Initials for an avatar circle: first letter of the first two words. */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function levelPercent(level: number): number {
  return Math.round((level / MAX_LEADER_LEVEL) * 100);
}

// Level 1 reads lightest, level 5 the deepest navy, so a row of avatars
// shows progression at a glance without needing to read numbers.
const LEVEL_TONES = [
  'bg-gray-200 text-gray-700',
  'bg-indigo-royal-100 text-indigo-royal-700',
  'bg-indigo-royal-300 text-indigo-royal-900',
  'bg-indigo-royal-500 text-white',
  'bg-indigo-royal-700 text-white',
] as const;

export function levelTone(level: number): string {
  const i = Math.min(Math.max(level, 1), MAX_LEADER_LEVEL) - 1;
  return LEVEL_TONES[i];
}

// French takes the singular for zero ("0 leader"), English the plural, so
// the three cases are separate keys rather than one string plus an "s".
export function leaderCountLabel(count: number, lang: AppLanguage): string {
  if (count === 0) return t('leaders.dashboard_count_none', lang);
  if (count === 1) return t('leaders.dashboard_count_singular', lang);
  return t('leaders.dashboard_count', lang).replace('{count}', String(count));
}

export function formatStartedDate(iso: string, lang: AppLanguage): string {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
