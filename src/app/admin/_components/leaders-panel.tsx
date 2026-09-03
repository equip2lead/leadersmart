import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { initialsOf, leaderCountLabel, levelTone } from '@/lib/leaders';
import type { AppLanguage, LeaderDevelopment } from '@/lib/types';

// Avatars shown before the row rolls up into a "+N" circle.
const MAX_AVATARS = 8;

export type LeaderSummary = {
  avatars: Array<{ id: string; name: string; level: number }>;
  overflow: number;
  activeCount: number;
};

// Active pipeline only — a deactivated leader is history, not someone
// currently in development. One extra row is fetched so "+N" is exact
// without a second COUNT.
export async function fetchLeaderSummary(
  churchId: string,
): Promise<LeaderSummary> {
  const supabase = await createClient();

  const { data: pipelineRows } = await supabase
    .from('leader_development')
    .select('*')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .order('current_level', { ascending: false })
    .limit(MAX_AVATARS + 1);
  const pipeline = (pipelineRows ?? []) as LeaderDevelopment[];

  const { data: memberRows } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('church_id', churchId);
  const nameById = new Map((memberRows ?? []).map((m) => [m.id, m.full_name]));

  return {
    avatars: pipeline.slice(0, MAX_AVATARS).map((p) => ({
      id: p.id,
      // A tracked user deactivated in `users` won't be in the map; fall
      // back to the id so the avatar still renders rather than blanking.
      name: nameById.get(p.user_id) ?? p.user_id,
      level: p.current_level,
    })),
    overflow: Math.max(0, pipeline.length - MAX_AVATARS),
    activeCount: pipeline.length,
  };
}

// Panel contents only — the caller supplies its own wrapper, since the
// two dashboards frame their sections differently. Shared so church and
// ministry can't drift on how a level reads.
export function LeadersPanelBody({
  summary,
  lang,
}: {
  summary: LeaderSummary;
  lang: AppLanguage;
}) {
  if (summary.avatars.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-ink">
          {t('leaders.dashboard_empty_title', lang)}
        </p>
        <p className="mt-1 text-sm text-body">
          {t('leaders.dashboard_empty_body', lang)}
        </p>
        <Link href="/admin/leaders" className="btn-primary mt-4">
          {t('leaders.dashboard_empty_cta', lang)}
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-wrap items-center gap-2">
        {summary.avatars.map((l) => (
          <li key={l.id}>
            <span
              className={
                'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ' +
                levelTone(l.level)
              }
              title={t('leaders.dashboard_tooltip', lang)
                .replace('{name}', l.name)
                .replace('{level}', String(l.level))}
            >
              {initialsOf(l.name)}
            </span>
          </li>
        ))}
        {summary.overflow > 0 && (
          <li>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-muted">
              {t('leaders.dashboard_more', lang).replace(
                '{n}',
                String(summary.overflow),
              )}
            </span>
          </li>
        )}
      </ul>
      <p className="mt-3 text-xs text-muted">
        {leaderCountLabel(summary.activeCount, lang)}
      </p>
    </>
  );
}

export function LeadersViewAllLink({ lang }: { lang: AppLanguage }) {
  return (
    <Link
      href="/admin/leaders"
      className="shrink-0 text-sm font-medium text-indigo-royal-700 hover:underline"
    >
      {t('leaders.dashboard_view_all', lang)}
    </Link>
  );
}
