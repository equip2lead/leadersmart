import Link from 'next/link';
import {
  Star,
  Building2,
  UserCog,
  ClipboardCheck,
  Users,
  LayoutGrid,
  Award,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { isOwner } from '@/lib/roles';
import type { Church, User } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { getDepartmentIcon } from '@/lib/icons';
import { getVocab } from '@/lib/vocabulary';
import {
  LeadersPanelBody,
  LeadersViewAllLink,
  fetchLeaderSummary,
} from './leaders-panel';

type PastorRef = { full_name: string | null } | null;
type ActiveAssignment = {
  id: string;
  assignment_month: string;
  pastor: PastorRef;
} | null;

// Current-week Sunday (start of ISO-ish week, Sunday-based) as YYYY-MM-DD.
function currentWeekStart(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function StatLink({
  href,
  label,
  value,
  hint,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="card flex items-start gap-3 transition hover:shadow-card-hover"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-royal-50 text-indigo-royal-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xl font-bold text-ink">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
      </div>
    </Link>
  );
}

type DeptStatus = 'green' | 'yellow' | 'red';

function statusStyle(s: DeptStatus): { dot: string; label: string; bg: string } {
  switch (s) {
    case 'green':
      return { dot: 'bg-emerald-500', label: 'admin.status.onTrack', bg: 'bg-emerald-50' };
    case 'yellow':
      return { dot: 'bg-amber-500', label: 'admin.status.late', bg: 'bg-amber-50' };
    case 'red':
      return { dot: 'bg-red-500', label: 'admin.status.missed', bg: 'bg-red-50' };
  }
}

// Extracted verbatim from src/app/admin/page.tsx. The only change is the
// signature: the route now resolves auth once and passes the result in,
// so church rendering below is untouched.
export async function ChurchDashboard({
  user,
  church,
}: {
  user: User;
  church: Church;
}) {
  const lang = user.preferred_language;
  const leaderSummary = await fetchLeaderSummary(church.id);
  const supabase = await createClient();

  const thisWeek = currentWeekStart();
  const lastWeek = addDays(thisWeek, -7);

  // Onboarding-skip prompts — only surface for the church owner. If
  // they skipped a wizard step, we nudge them here until the
  // corresponding _skipped_at is cleared (which happens automatically
  // when they eventually invite / create / assign via the CTAs below).
  const showSkipPrompts = isOwner(user.role);
  const skipRes = showSkipPrompts
    ? await supabase
        .from('user_onboarding_progress')
        .select('admins_skipped_at, departments_skipped_at, pom_skipped_at')
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null };
  const skipped = skipRes.data;

  // Ministries use the same tables but different vocabulary, and have no
  // Pastor of the Month at all.
  const isMinistry = church.organization_type === 'ministry';
  const v = getVocab(church.organization_type, lang);
  const skipKey = (card: 'admins' | 'departments', part: 'title' | 'body' | 'cta') =>
    isMinistry
      ? `admin.onboardingSkipped.${card}.ministry.${part}`
      : `admin.onboardingSkipped.${card}.${part}`;

  // pom_skipped_at is excluded for ministries — the wizard sets it for
  // every ministry on completion, so counting it would render the
  // "Finish setting up" heading above an empty grid.
  const anySkipped =
    !!skipped &&
    !!(
      skipped.admins_skipped_at ||
      skipped.departments_skipped_at ||
      (!isMinistry && skipped.pom_skipped_at)
    );

  const [activeRes, deptCountRes, userCountRes, deptsRes, latestChecklistRes, reportsRes] =
    await Promise.all([
      supabase
        .from('pastor_assignments')
        .select('id, assignment_month, pastor:users!pastor_user_id(full_name)')
        .eq('church_id', church.id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('departments')
        .select('id', { count: 'exact', head: true })
        .eq('church_id', church.id)
        .eq('is_active', true),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('church_id', church.id)
        .eq('is_active', true),
      supabase
        .from('departments')
        .select('id, name, icon')
        .eq('church_id', church.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(50),
      supabase
        .from('sunday_checklists')
        .select('service_date, submitted_at, pastor_assignment:pastor_assignments!inner(church_id)')
        .eq('pastor_assignment.church_id', church.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('department_weekly_reports')
        .select('department_id, week_start_date, submitted_at')
        .not('submitted_at', 'is', null)
        .gte('week_start_date', addDays(thisWeek, -14))
        .order('week_start_date', { ascending: false }),
    ]);

  const active = (activeRes.data as ActiveAssignment) ?? null;
  const deptCount = deptCountRes.count ?? 0;
  const userCount = userCountRes.count ?? 0;
  const departments = deptsRes.data ?? [];
  const latestChecklist = latestChecklistRes.data as
    | { service_date: string; submitted_at: string | null }
    | null;
  const reports = reportsRes.data ?? [];

  // Bucket reports per department: most recent submitted week_start_date wins.
  const latestPerDept: Record<string, string> = {};
  for (const r of reports) {
    const existing = latestPerDept[r.department_id];
    if (!existing || r.week_start_date > existing) {
      latestPerDept[r.department_id] = r.week_start_date as string;
    }
  }

  const deptStatuses = departments.map((d) => {
    const latest = latestPerDept[d.id];
    let status: DeptStatus;
    if (latest === thisWeek) status = 'green';
    else if (latest === lastWeek) status = 'yellow';
    else status = 'red';
    return { ...d, latest, status };
  });

  const activePastorName = active?.pastor?.full_name ?? '—';
  const activeMonth = active?.assignment_month ?? '';
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
  };

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={v.dashboardTitle} subtitle={church.name} />

      {anySkipped && skipped && (
        <section className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t('admin.onboardingSkipped.title', lang)}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skipped.admins_skipped_at && (
              <SkipCard
                icon={Users}
                titleKey={skipKey('admins', 'title')}
                bodyKey={skipKey('admins', 'body')}
                ctaKey={skipKey('admins', 'cta')}
                href="/admin/users"
                lang={lang}
              />
            )}
            {skipped.departments_skipped_at && (
              <SkipCard
                icon={LayoutGrid}
                titleKey={skipKey('departments', 'title')}
                bodyKey={skipKey('departments', 'body')}
                ctaKey={skipKey('departments', 'cta')}
                href="/admin/departments"
                lang={lang}
              />
            )}
            {/* Pastor of the Month is church-only — ministries never get
                this prompt, because there is nothing for it to link to. */}
            {!isMinistry && skipped.pom_skipped_at && (
              <SkipCard
                icon={Award}
                titleKey="admin.onboardingSkipped.pom.title"
                bodyKey="admin.onboardingSkipped.pom.body"
                ctaKey="admin.onboardingSkipped.pom.cta"
                href="/admin/assignments"
                lang={lang}
              />
            )}
          </div>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Pastor of the Month is a church concept — ministries don't get
            a renamed version of this card, they get no card. */}
        {v.showPom && (
          <StatLink
            href="/admin/assignments"
            label={v.pomLabel ?? ''}
            value={activePastorName}
            hint={activeMonth}
            icon={Star}
          />
        )}
        <StatLink
          href="/admin/departments"
          label={v.departments}
          value={String(deptCount)}
          icon={Building2}
        />
        <StatLink
          href="/admin/users"
          label={t('admin.stat.users', lang)}
          value={String(userCount)}
          icon={UserCog}
        />
        <StatLink
          href={active ? `/admin/assignments/${active.id}/evaluate` : '/admin/assignments'}
          label={t('admin.stat.lastChecklist', lang)}
          value={formatDate(latestChecklist?.service_date)}
          icon={ClipboardCheck}
        />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">
            {t('leaders.page_title', lang)}
          </h2>
          {leaderSummary.avatars.length > 0 && (
            <LeadersViewAllLink lang={lang} />
          )}
        </div>
        <div className="mt-4">
          <LeadersPanelBody summary={leaderSummary} lang={lang} />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {t('admin.reports.title', lang)}
          </h2>
          <p className="text-xs text-muted">
            {t('admin.reports.legend', lang)}
          </p>
        </div>
        {deptStatuses.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-muted">
            {t('common.empty', lang)}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {deptStatuses.map((d) => {
              const Icon = getDepartmentIcon(d.icon) ?? Building2;
              const s = statusStyle(d.status);
              return (
                <li key={d.id}>
                  <Link
                    href="/admin/departments"
                    className={`flex items-center gap-3 rounded-xl border border-gray-100 ${s.bg} px-4 py-3 transition hover:shadow-card-hover`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-royal-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{d.name}</p>
                      <p className="truncate text-xs text-muted">
                        {d.latest
                          ? `${t('admin.reports.lastSubmitted', lang)}: ${formatDate(d.latest)}`
                          : t('admin.reports.never', lang)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-body">
                        {t(s.label, lang)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// Inline empty-state card for a wizard step the owner skipped.
// Auto-clears when they take the same action through the linked page
// (see the corresponding server actions in admin/users, /departments,
// /assignments — they null the _skipped_at flag on success).
function SkipCard({
  icon: Icon,
  titleKey,
  bodyKey,
  ctaKey,
  href,
  lang,
}: {
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  href: string;
  lang: 'en' | 'fr';
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-gold-warm-100 bg-gold-warm-50/40 p-5 transition hover:border-gold-warm-200 hover:bg-gold-warm-50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-warm-100 text-gold-warm-700">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">{t(titleKey, lang)}</p>
      <p className="mt-1 text-xs text-body">{t(bodyKey, lang)}</p>
      <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gold-warm-700 group-hover:gap-2">
        {t(ctaKey, lang)}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </p>
    </Link>
  );
}
