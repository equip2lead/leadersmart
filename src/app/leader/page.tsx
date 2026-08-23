import Link from 'next/link';
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  FileText,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { LEADER_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

export const dynamic = 'force-dynamic';

type SundayScheduleStatus =
  | { kind: 'none' }
  | {
      kind: 'draft' | 'published';
      id: string;
      service_name: string;
      slot_count: number;
      confirmed_count: number;
    };

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="card flex items-center justify-between gap-4 transition hover:shadow-card-hover"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="font-semibold text-ink">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
    </Link>
  );
}

// This Sunday (or today, if today IS Sunday) → YYYY-MM-DD UTC.
function thisSunday(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  return d.toISOString().slice(0, 10);
}

// Start of current week (Sunday) as YYYY-MM-DD UTC.
function currentWeekStart(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export default async function LeaderDashboard() {
  const { user, church } = await requireRole(LEADER_ROLES);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data: dept } = await supabase
    .from('departments')
    .select('id, name, icon')
    .eq('church_id', church.id)
    .eq('leader_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!dept) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={`${t('common.welcome', lang)}, ${user.full_name.split(' ')[0]}`}
          subtitle={t('leader.noDept', lang)}
        />
      </div>
    );
  }

  const targetSunday = thisSunday();
  const weekStart = currentWeekStart();

  const [teamRes, sundayScheduleRes, latestReportRes] = await Promise.all([
    supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', dept.id)
      .eq('is_active', true),
    supabase
      .from('schedules')
      .select('id, service_name, status, slots')
      .eq('department_id', dept.id)
      .eq('service_date', targetSunday)
      .maybeSingle(),
    supabase
      .from('department_weekly_reports')
      .select('week_start_date, submitted_at')
      .eq('department_id', dept.id)
      .not('submitted_at', 'is', null)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const teamSize = teamRes.count ?? 0;
  const latestReport = latestReportRes.data;

  // Compute "this Sunday" schedule status.
  let sundayStatus: SundayScheduleStatus = { kind: 'none' };
  if (sundayScheduleRes.data) {
    const raw = sundayScheduleRes.data;
    const slots = Array.isArray(raw.slots) ? raw.slots : [];
    const slot_count = slots.length;
    let confirmed_count = 0;
    if (slot_count > 0) {
      const { count } = await supabase
        .from('schedule_confirmations')
        .select('id', { count: 'exact', head: true })
        .eq('schedule_id', raw.id)
        .eq('response', 'yes');
      confirmed_count = count ?? 0;
    }
    sundayStatus = {
      kind: raw.status === 'published' ? 'published' : 'draft',
      id: raw.id,
      service_name: raw.service_name,
      slot_count,
      confirmed_count,
    };
  }

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
  };

  const sundayCardValue =
    sundayStatus.kind === 'none'
      ? t('leader.sunday.none', lang)
      : sundayStatus.kind === 'draft'
        ? t('leader.sunday.draft', lang)
        : `${sundayStatus.confirmed_count}/${sundayStatus.slot_count} ${t('leader.sunday.confirmed', lang)}`;
  const sundayCardHint =
    sundayStatus.kind === 'none'
      ? formatDate(targetSunday)
      : `${sundayStatus.service_name} · ${formatDate(targetSunday)}`;

  const reportSubmittedThisWeek = latestReport?.week_start_date === weekStart;
  const reportCardValue = reportSubmittedThisWeek
    ? t('leader.report.thisWeek', lang)
    : latestReport?.week_start_date
      ? formatDate(latestReport.week_start_date)
      : t('leader.report.never', lang);
  const reportCardHint = latestReport?.submitted_at
    ? `${t('leader.report.lastSubmitted', lang)} ${formatDate(latestReport.submitted_at)}`
    : undefined;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={dept.name} subtitle={t('leader.title', lang)} />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('leader.stat.team', lang)} value={String(teamSize)} />
        <StatCard
          label={t('leader.stat.sunday', lang)}
          value={sundayCardValue}
          hint={sundayCardHint}
        />
        <StatCard
          label={t('leader.stat.lastReport', lang)}
          value={reportCardValue}
          hint={reportCardHint}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">
          {t('pastor.quickActions', lang)}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/leader/team"
            label={t('nav.team', lang)}
            icon={Users}
          />
          <QuickAction
            href="/leader/schedules"
            label={t('nav.schedules', lang)}
            icon={CalendarDays}
          />
          <QuickAction
            href="/leader/attendance"
            label={t('nav.attendance', lang)}
            icon={ClipboardCheck}
          />
          <QuickAction
            href="/leader/report"
            label={t('nav.weeklyReport', lang)}
            icon={FileText}
          />
        </div>
      </section>
    </div>
  );
}
