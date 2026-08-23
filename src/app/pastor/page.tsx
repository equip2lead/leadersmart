import Link from 'next/link';
import {
  ClipboardCheck,
  CalendarCheck,
  FileText,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { WeeklyTaskList, type DashboardTask } from './_task-list';

export const dynamic = 'force-dynamic';

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

// Given an "assignment_month" (YYYY-MM-01 date), compute which of weeks 1-5
// today falls into. Anything before the month → week 1. Anything after → 5.
function computeCurrentWeek(assignmentMonth: string): number {
  const [y, m] = assignmentMonth.split('-').map(Number);
  if (!y || !m) return 1;
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const now = new Date();
  const nowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (nowUtc < firstOfMonth) return 1;
  const diffDays = Math.floor(
    (nowUtc.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.min(5, Math.max(1, Math.floor(diffDays / 7) + 1));
}

export default async function PastorDashboard() {
  const { user, church } = await requireRole(['pastor']);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data: active } = await supabase
    .from('pastor_assignments')
    .select('id, assignment_month')
    .eq('church_id', church.id)
    .eq('pastor_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!active) {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={`${t('pastor.welcomeBack', lang)}, ${user.full_name.split(' ')[0]}`}
          subtitle={t('pastor.notAssigned', lang)}
        />
      </div>
    );
  }

  const [tasksRes, checklistsRes] = await Promise.all([
    supabase
      .from('weekly_execution_tasks')
      .select('id, week_number, task_text, is_complete')
      .eq('pastor_assignment_id', active.id)
      .order('week_number')
      .order('display_order'),
    supabase
      .from('sunday_checklists')
      .select('id, is_draft, submitted_at')
      .eq('pastor_assignment_id', active.id),
  ]);

  const tasks = (tasksRes.data ?? []) as DashboardTask[];
  const checklists = checklistsRes.data ?? [];

  const currentWeek = computeCurrentWeek(active.assignment_month);
  const submittedChecklists = checklists.filter((c) => !c.is_draft && c.submitted_at).length;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={`${t('pastor.welcomeBack', lang)}, ${user.full_name.split(' ')[0]}`}
        subtitle={`${t('pastor.potm', lang)} — ${active.assignment_month}`}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label={t('pastor.card.month', lang)}
          value={active.assignment_month}
        />
        <StatCard
          label={t('pastor.card.currentWeek', lang)}
          value={`${currentWeek}/5`}
        />
        <StatCard
          label={t('pastor.card.checklists', lang)}
          value={String(submittedChecklists)}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">
          {t('pastor.quickActions', lang)}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/pastor/sunday-checklist"
            label={t('pastor.qa.checklist', lang)}
            icon={ClipboardCheck}
          />
          <QuickAction
            href="/pastor/weekly-plan"
            label={t('pastor.qa.plan', lang)}
            icon={CalendarCheck}
          />
          <QuickAction
            href="/pastor/monthly-report"
            label={t('pastor.qa.postservice', lang)}
            icon={FileText}
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {t('pastor.plan.title', lang)}
          </h2>
          <Link
            href="/pastor/weekly-plan"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {t('common.edit', lang)}
          </Link>
        </div>
        <div className="mt-4">
          <WeeklyTaskList tasks={tasks} currentWeek={currentWeek} lang={lang} />
        </div>
      </section>
    </div>
  );
}
