import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { WeeklyPlanBoard } from './_board';
import type { TaskCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';

export type PlanTask = {
  id: string;
  week_number: number;
  task_text: string;
  is_complete: boolean;
  category: TaskCategory;
  display_order: number;
};

export default async function WeeklyPlanPage() {
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
          title={t('pastor.plan.title', lang)}
          subtitle={t('pastor.notAssigned', lang)}
        />
      </div>
    );
  }

  const { data } = await supabase
    .from('weekly_execution_tasks')
    .select('id, week_number, task_text, is_complete, category, display_order')
    .eq('pastor_assignment_id', active.id)
    .order('week_number', { ascending: true })
    .order('display_order', { ascending: true });

  const tasks = (data ?? []) as PlanTask[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('pastor.plan.title', lang)}
        subtitle={`${t('pastor.potm', lang)} — ${active.assignment_month}`}
      />
      <WeeklyPlanBoard assignmentId={active.id} initial={tasks} />
    </div>
  );
}
