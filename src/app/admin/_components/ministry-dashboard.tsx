import Link from 'next/link';
import { BarChart3, Globe, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { flagForCode } from '@/lib/countries';
import { tallyByBranch, zoneCountLabel } from '@/lib/zones';
import {
  currentMonthStart,
  statusClass,
  statusLabel,
  type DisplayStatus,
} from '@/lib/reports';
import type { BranchReport } from '@/lib/types';
import {
  LeadersPanelBody,
  LeadersViewAllLink,
  fetchLeaderSummary,
} from './leaders-panel';
import type { AppLanguage, Branch, Church, User } from '@/lib/types';

// How many branch tiles fit before the grid rolls up into a "+N more"
// tile. Eight fills three rows evenly at the desktop breakpoint.
const MAX_TILES = 8;

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

  const leaderSummary = await fetchLeaderSummary(church.id);

  // This month's report status per visible branch. A branch with no row
  // yet is "pending" — that is a display state, not a stored one.
  const { data: reportRows } = await supabase
    .from('branch_reports')
    .select('*')
    .eq('report_month', currentMonthStart())
    .in('branch_id', visible.length ? visible.map((b) => b.id) : ['']);
  const statusByBranch = new Map<string, DisplayStatus>(
    ((reportRows ?? []) as BranchReport[]).map((r) => [r.branch_id, r.status]),
  );

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

        <Panel
          icon={BarChart3}
          title={t('reports.dashboard.panel_title', lang)}
          action={
            visible.length > 0 ? (
              <Link
                href={`/admin/branches/${visible[0].id}/reports`}
                className="shrink-0 text-sm font-medium text-indigo-royal-700 hover:underline"
              >
                {t('reports.dashboard.view_all', lang)}
              </Link>
            ) : null
          }
        >
          <p className="-mt-2 mb-4 text-sm text-muted">
            {t('reports.dashboard.panel_subtitle', lang)}
          </p>
          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-muted">
              {t('reports.dashboard.no_branches', lang)}
            </p>
          ) : (
            <ul className="space-y-2">
              {visible.map((b) => {
                const status = statusByBranch.get(b.id) ?? 'pending';
                return (
                  <li key={b.id}>
                    <Link
                      href={`/admin/branches/${b.id}/reports`}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-2.5 transition hover:border-gray-200 hover:shadow-card"
                    >
                      <span className="text-lg leading-none" aria-hidden="true">
                        {flagForCode(b.country_code)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                        {b.name}
                      </span>
                      <span
                        className={
                          'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                          statusClass(status)
                        }
                      >
                        {statusLabel(status, lang)}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {overflow > 0 && (
                <li>
                  <Link
                    href="/admin/branches"
                    className="block rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-muted transition hover:border-gray-400 hover:text-ink"
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

        <Panel
          icon={Sparkles}
          title={t('dashboard.ministry.leaders_title', lang)}
          action={
            leaderSummary.avatars.length > 0 ? (
              <LeadersViewAllLink lang={lang} />
            ) : null
          }
        >
          <LeadersPanelBody summary={leaderSummary} lang={lang} />
        </Panel>
      </div>
    </div>
  );
}
