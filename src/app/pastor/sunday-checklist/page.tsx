import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { ChecklistForm } from './_form';

export const dynamic = 'force-dynamic';

export default async function SundayChecklistPage() {
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
          title={t('pastor.sunday.title', lang)}
          subtitle={t('pastor.notAssigned', lang)}
        />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from('sunday_checklists')
    .select('*')
    .eq('pastor_assignment_id', active.id)
    .eq('service_date', today)
    .maybeSingle();

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('pastor.sunday.title', lang)}
        subtitle={`${t('pastor.potm', lang)} — ${active.assignment_month}`}
      />
      <ChecklistForm
        assignmentId={active.id}
        existingId={existing?.id ?? null}
        initialItems={(existing?.items_checked as Record<string, boolean> | undefined) ?? {}}
        initialAttendance={existing?.attendance_count ?? null}
        initialOffering={existing?.offering_total ?? null}
        initialVisitors={existing?.new_visitors_count ?? null}
        initialIssues={existing?.issues_text ?? ''}
      />
    </div>
  );
}
