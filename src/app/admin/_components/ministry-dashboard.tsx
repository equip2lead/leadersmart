import Link from 'next/link';
import { CalendarDays, Globe, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { flagForCode } from '@/lib/countries';
import { tallyByBranch, zoneCountLabel } from '@/lib/zones';
import { initialsOf, leaderCountLabel, levelTone } from '@/lib/leaders';
import type { LeaderDevelopment } from '@/lib/types';
import type { AppLanguage, Branch, Church, User } from '@/lib/types';

// How many branch tiles fit before the grid rolls up into a "+N more"
// tile. Eight fills three rows evenly at the desktop breakpoint.
const MAX_TILES = 8;

// Avatars shown before the row rolls up into a "+N" circle.
const MAX_AVATARS = 8;

// Greeting bucket from the *viewer's* clock. Rendered on the server, so
// this is the server's hour, not the user's — see the note where it is
// called. Kept as a pure function so the boundary is obvious.
function greetingKey(hour: number): string {
  if (hour < 12) return 'dashboard.ministry.greeting_morning';
  if (hour < 18) return 'dashboard.ministry.greeting_afternoon';
  return 'dashboard.ministry.greeting_evening';
}

function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Globe;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Icon className="h-5 w-5 text-indigo-royal-700" aria-hidden="true" />
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export async function MinistryDashboard({
  user,
  church,
}: {
  user: User;
  church: Church;
}) {
  const lang: AppLanguage = user.preferred_language;
  const supabase = await createClient();

  // Headquarters first, then alphabetical — the HQ anchors the grid and
  // shouldn't move as branches are added. One extra row is fetched so
  // the "+N more" count is exact without a second COUNT query.
  const { data } = await supabase
    .from('branches')
    .select('*')
    .eq('church_id', church.id)
    .order('is_headquarters', { ascending: false })
    .order('name')
    .limit(MAX_TILES + 1);

  const branches = (data ?? []) as Branch[];
  const visible = branches.slice(0, MAX_TILES);
  const overflow = Math.max(0, branches.length - MAX_TILES);

  // Zone counts for the visible tiles only — the overflow tile shows a
  // branch count, not zones, so fetching the rest would be wasted work.
  const { data: zoneRows } = await supabase
    .from('zones')
    .select('branch_id')
    .in('branch_id', visible.length ? visible.map((b) => b.id) : ['']);
  const zoneCounts = tallyByBranch(zoneRows ?? []);

  // Active pipeline only — a deactivated leader is history, not someone
  // currently in development. One extra row so "+N" is exact.
  const { data: pipelineRows } = await supabase
    .from('leader_development')
    .select('*')
    .eq('church_id', church.id)
    .eq('is_active', true)
    .order('current_level', { ascending: false })
    .limit(MAX_AVATARS + 1);
  const pipeline = (pipelineRows ?? []) as LeaderDevelopment[];

  const { data: memberRows } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('church_id', church.id);
  const nameById = new Map((memberRows ?? []).map((m) => [m.id, m.full_name]));

  const leaderAvatars = pipeline.slice(0, MAX_AVATARS).map((p) => ({
    id: p.id,
    name: nameById.get(p.user_id) ?? p.user_id,
    level: p.current_level,
  }));
  const leaderOverflow = Math.max(0, pipeline.length - MAX_AVATARS);

  const firstName = user.full_name.trim().split(/\s+/)[0] || user.full_name;
  const greeting = t(greetingKey(new Date().getHours()), lang).replace(
    '{name}',
    firstName,
  );

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-body">
          {t('dashboard.ministry.greeting_subtitle', lang)}
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <Panel
          icon={Globe}
          title={t('dashboard.ministry.branches_title', lang)}
          action={
            branches.length > 0 ? (
              <Link
                href="/admin/branches"
                className="shrink-0 text-sm font-medium text-indigo-royal-700 hover:underline"
              >
                {t('dashboard.ministry.branches_manage_link', lang)}
              </Link>
            ) : null
          }
        >
          {branches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
              <p className="text-sm text-body">
                {t('dashboard.ministry.branches_empty_title', lang)}
              </p>
              <Link href="/admin/branches" className="btn-primary mt-4">
                {t('dashboard.ministry.branches_empty_cta', lang)}
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/branches/${b.id}/zones`}
                    className={
                      'flex items-center gap-3 rounded-lg border px-4 py-3 transition hover:shadow-card ' +
                      (b.is_headquarters
                        ? 'border-[#B91572] bg-[#FCE7F3]'
                        : 'border-gray-200 bg-[#FDFCF7]')
                    }
                  >
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {flagForCode(b.country_code)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {b.name}
                      </span>
                      <span className="block text-xs text-muted">
                        {zoneCountLabel(zoneCounts[b.id] ?? 0, lang)}
                      </span>
                    </span>
                    {b.is_headquarters && (
                      <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B91572]">
                        {t('branches.hq_badge', lang)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}

              {overflow > 0 && (
                <li>
                  <Link
                    href="/admin/branches"
                    className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-muted transition hover:border-gray-400 hover:text-ink"
                  >
                    {t('dashboard.ministry.branches_more', lang).replace(
                      '{n}',
                      String(overflow),
                    )}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Panel>

        {/* Sections 3 and 4 are intentionally inert until 5e and 5d. The
            skeletons are there so the panels read as "not built yet"
            rather than "failed to load" — an empty white box would look
            like a bug. aria-hidden keeps the fake rows out of the
            accessibility tree, where they would announce as content. */}
        <Panel
          icon={CalendarDays}
          title={t('dashboard.ministry.upcoming_title', lang)}
        >
          <p className="text-sm text-muted">
            {t('dashboard.ministry.upcoming_placeholder', lang)}
          </p>
          <div className="mt-4 space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-gray-200" />
                <span className="h-2 w-2/5 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          icon={Sparkles}
          title={t('dashboard.ministry.leaders_title', lang)}
          action={
            leaderAvatars.length > 0 ? (
              <Link
                href="/admin/leaders"
                className="shrink-0 text-sm font-medium text-indigo-royal-700 hover:underline"
              >
                {t('leaders.dashboard_view_all', lang)}
              </Link>
            ) : null
          }
        >
          {leaderAvatars.length === 0 ? (
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
          ) : (
            <>
              <ul className="flex flex-wrap items-center gap-2">
                {leaderAvatars.map((l) => (
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
                {leaderOverflow > 0 && (
                  <li>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-muted">
                      {t('leaders.dashboard_more', lang).replace(
                        '{n}',
                        String(leaderOverflow),
                      )}
                    </span>
                  </li>
                )}
              </ul>
              <p className="mt-3 text-xs text-muted">
                {leaderCountLabel(pipeline.length, lang)}
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
