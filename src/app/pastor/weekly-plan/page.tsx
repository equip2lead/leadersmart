import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { WeeklyPlanBoard } from './_board';
import type { TaskCategory } from '@/lib/types';
import { loadPastorPageContext } from '../_context';

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
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  const lang = user.preferred_language;
  const supabase = await createClient();
  const ctx = await loadPastorPageContext(user, church.id);

  if (ctx.kind === 'no_active') {
    return (
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <PageHeading
          title={t('pastor.plan.title', lang)}
          subtitle={t('pastor.noActiveAssignment', lang)}
        />
        <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-muted">
          <Link href="/admin/assignments" className="text-indigo-royal-700 hover:underline">
            {t('pastor.setAssignmentLink', lang)}
          </Link>
        </p>
      </div>
    );
  }

  const { data } = await supabase
    .from('weekly_execution_tasks')
    .select('id, week_number, task_text, is_complete, category, display_order')
    .eq('pastor_assignment_id', ctx.assignmentId)
    .order('week_number', { ascending: true })
    .order('display_order', { ascending: true });

  const tasks = (data ?? []) as PlanTask[];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={
          ctx.isOnBehalf
            ? t('pastor.plan.onBehalfTitle', lang).replace('{name}', ctx.pastorName)
            : t('pastor.plan.title', lang)
        }
        subtitle={`${t('pastor.potm', lang)} — ${ctx.assignmentMonth}`}
      />
      {ctx.isOnBehalf && (
        <div className="mt-4 rounded-lg bg-indigo-royal-50 px-4 py-3 text-sm text-indigo-royal-800">
          {t('pastor.plan.onBehalfBanner', lang).replace('{name}', ctx.pastorName)}
        </div>
      )}
      <WeeklyPlanBoard assignmentId={ctx.assignmentId} initial={tasks} lang={lang} />
    </div>
  );
}
