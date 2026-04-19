import Link from 'next/link';
import {
  ClipboardCheck,
  CalendarCheck,
  FileText,
  Star,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

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
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
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

function weekOfMonth(now: Date, first: Date): number {
  const diffDays = Math.floor(
    (now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, Math.floor(diffDays / 7) + 1);
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

  const [tasksRes, checklistsRes, evalRes] = await Promise.all([
    supabase
      .from('weekly_execution_tasks')
      .select('id, week_number, task_text, is_complete')
      .eq('pastor_assignment_id', active.id)
      .order('week_number')
      .order('display_order'),
    supabase
      .from('sunday_checklists')
      .select('id, service_date, is_draft, submitted_at')
      .eq('pastor_assignment_id', active.id),
    supabase
      .from('evaluations')
      .select('overall_score, signed_at')
      .eq('pastor_assignment_id', active.id)
      .maybeSingle(),
  ]);

  const tasks = tasksRes.data ?? [];
  const checklists = checklistsRes.data ?? [];
  const evaluation = evalRes.data;

  // Compute week-of-month (1-5)
  const [y, m] = active.assignment_month.split('-').map(Number);
  const firstOfMonth = new Date(y, (m ?? 1) - 1, 1);
  const now = new Date();
  const currentWeek =
    now.getFullYear() === y && now.getMonth() === (m ?? 1) - 1
      ? weekOfMonth(now, firstOfMonth)
      : 1;
  const totalWeeks = 5;

  const thisWeekTasks = tasks.filter((t) => t.week_number === currentWeek);
  const thisWeekDone = thisWeekTasks.filter((t) => t.is_complete).length;

  const submittedChecklists = checklists.filter((c) => !c.is_draft && c.submitted_at).length;
  const totalSundays = 4; // approximate for a month; refined later with real service dates

  const evalSigned = !!evaluation?.signed_at;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={`${t('pastor.welcomeBack', lang)}, ${user.full_name.split(' ')[0]}`}
        subtitle={`${t('pastor.potm', lang)} — ${active.assignment_month}`}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t('pastor.card.currentWeek', lang)}
          value={`${currentWeek}/${totalWeeks}`}
        />
        <StatCard
          label={t('pastor.card.tasksCompleted', lang)}
          value={`${thisWeekDone}/${thisWeekTasks.length}`}
          hint={t('pastor.thisWeek', lang)}
        />
        <StatCard
          label={t('pastor.card.checklists', lang)}
          value={`${submittedChecklists}/${totalSundays}`}
        />
        <StatCard
          label={t('pastor.card.avgRating', lang)}
          value={evalSigned ? Number(evaluation!.overall_score).toFixed(1) : '—'}
          hint={evalSigned ? undefined : t('pastor.card.pendingEval', lang)}
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
            href="/pastor/monthly-report"
            label={t('pastor.qa.postservice', lang)}
            icon={FileText}
          />
          <QuickAction
            href="/pastor/weekly-plan"
            label={t('pastor.qa.plan', lang)}
            icon={CalendarCheck}
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-ink">
            {t('pastor.thisWeek', lang)}
          </h2>
          {thisWeekTasks.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t('common.empty', lang)}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {thisWeekTasks.slice(0, 6).map((task) => (
                <li key={task.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      task.is_complete
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {task.is_complete && '✓'}
                  </span>
                  <span
                    className={`text-sm ${
                      task.is_complete ? 'text-muted line-through' : 'text-body'
                    }`}
                  >
                    {task.task_text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-ink">
            {t('pastor.evalAreas', lang)}
          </h2>
          {evalSigned ? (
            <div className="mt-4 flex items-center gap-3">
              <Star className="h-5 w-5 text-flame-600" aria-hidden="true" />
              <p className="text-sm text-body">
                Overall score: <strong>{Number(evaluation!.overall_score).toFixed(1)}/5</strong>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              {t('pastor.evalPendingMsg', lang)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
