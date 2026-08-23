import Link from 'next/link';
import { CalendarDays, ClipboardCheck, FileText, ArrowRight, type LucideIcon } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

export const dynamic = 'force-dynamic';

// Landing page for "Reports & Analytics" sidebar entry. Fetches a few
// headline counts + links to the three aggregate views. Deeper charts
// land in a later iteration.
export default async function AnalyticsPage() {
  const { user, church } = await requireRole(ADMIN_ROLES);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const [deptRes, schedRes, reportRes, checklistRes] = await Promise.all([
    supabase.from('departments').select('id', { count: 'exact', head: true }).eq('church_id', church.id).eq('is_active', true),
    supabase.from('schedules').select('id, department:departments!inner(church_id)', { count: 'exact', head: true }).eq('department.church_id', church.id),
    supabase.from('department_weekly_reports').select('id, department:departments!inner(church_id)', { count: 'exact', head: true }).eq('department.church_id', church.id).not('submitted_at', 'is', null),
    supabase.from('sunday_checklists').select('id, pastor_assignment:pastor_assignments!inner(church_id)', { count: 'exact', head: true }).eq('pastor_assignment.church_id', church.id).not('submitted_at', 'is', null),
  ]);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={t('analytics.title', lang)} subtitle={t('analytics.subtitle', lang)} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock label={t('analytics.activeDepts', lang)} value={String(deptRes.count ?? 0)} />
        <StatBlock label={t('analytics.totalSchedules', lang)} value={String(schedRes.count ?? 0)} />
        <StatBlock label={t('analytics.submittedReports', lang)} value={String(reportRes.count ?? 0)} />
        <StatBlock label={t('analytics.submittedChecklists', lang)} value={String(checklistRes.count ?? 0)} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <AggregateLink
          href="/admin/schedules"
          titleKey="nav.allSchedules"
          bodyKey="analytics.schedules.body"
          icon={CalendarDays}
          lang={lang}
        />
        <AggregateLink
          href="/admin/attendance"
          titleKey="nav.allAttendance"
          bodyKey="analytics.attendance.body"
          icon={ClipboardCheck}
          lang={lang}
        />
        <AggregateLink
          href="/admin/weekly-reports"
          titleKey="nav.allReports"
          bodyKey="analytics.reports.body"
          icon={FileText}
          lang={lang}
        />
      </div>

      <p className="mt-8 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-3 text-center text-xs text-muted">
        {t('analytics.chartsSoon', lang)}
      </p>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function AggregateLink({
  href,
  titleKey,
  bodyKey,
  icon: Icon,
  lang,
}: {
  href: string;
  titleKey: string;
  bodyKey: string;
  icon: LucideIcon;
  lang: Parameters<typeof t>[1];
}) {
  return (
    <Link
      href={href}
      className="card flex items-start gap-3 transition hover:shadow-card-hover"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{t(titleKey, lang)}</p>
        <p className="mt-1 text-xs text-muted">{t(bodyKey, lang)}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
    </Link>
  );
}
