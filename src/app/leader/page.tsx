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
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

export const dynamic = 'force-dynamic';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
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

export default async function LeaderDashboard() {
  const { user, church } = await requireRole(['department_leader']);
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

  const [teamRes, scheduleRes] = await Promise.all([
    supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', dept.id)
      .eq('is_active', true),
    supabase
      .from('schedules')
      .select('id, service_date, status')
      .eq('department_id', dept.id)
      .gte('service_date', new Date().toISOString().slice(0, 10))
      .order('service_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const teamSize = teamRes.count ?? 0;
  const upcoming = scheduleRes.data?.service_date ?? '—';

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={dept.name}
        subtitle={t('leader.title', lang)}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label={t('leader.stat.team', lang)} value={String(teamSize)} />
        <StatCard label={t('leader.stat.upcoming', lang)} value={upcoming} />
        <StatCard label={t('leader.stat.attendance', lang)} value="—" />
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
