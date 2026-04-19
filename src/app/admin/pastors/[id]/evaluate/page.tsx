import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeading } from '@/components/page-heading';
import { EvaluationForm } from './_form';

export const dynamic = 'force-dynamic';

export default async function EvaluatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, church } = await requireRole(['senior_pastor', 'admin']);
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('pastor_assignments')
    .select('id, assignment_month, pastor:users!pastor_user_id(id, full_name)')
    .eq('id', id)
    .eq('church_id', church.id)
    .maybeSingle();

  if (!assignment) {
    notFound();
  }

  const { data: existing } = await supabase
    .from('evaluations')
    .select('*')
    .eq('pastor_assignment_id', id)
    .maybeSingle();

  const pastor = assignment.pastor as unknown as
    | { id: string; full_name: string | null }
    | null;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title="Pastor Evaluation"
        subtitle={`${pastor?.full_name ?? 'Pastor'} — ${assignment.assignment_month}`}
      />
      <EvaluationForm
        assignmentId={id}
        evaluatorId={user.id}
        existing={existing ?? null}
      />
    </div>
  );
}
