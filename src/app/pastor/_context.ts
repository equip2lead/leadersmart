import { createClient } from '@/lib/supabase/server';
import type { User } from '@/lib/types';

export type PastorPageContext =
  | {
      kind: 'no_active';
    }
  | {
      kind: 'ready';
      assignmentId: string;
      assignmentMonth: string;
      pastorUserId: string;
      pastorName: string;
      isOnBehalf: boolean;
    };

// Loads the church's currently-active Pastor of the Month assignment
// and describes whether the caller is that pastor or acting on behalf.
// Returns kind='no_active' when no active assignment exists so callers
// can render the correct empty state.
export async function loadPastorPageContext(
  me: User,
  churchId: string,
): Promise<PastorPageContext> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('pastor_assignments')
    .select('id, assignment_month, pastor_user_id, pastor:users!pastor_user_id(full_name)')
    .eq('church_id', churchId)
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return { kind: 'no_active' };

  const pastorRef = data.pastor as
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
  const pastorRow = Array.isArray(pastorRef) ? pastorRef[0] : pastorRef;

  return {
    kind: 'ready',
    assignmentId: data.id,
    assignmentMonth: data.assignment_month,
    pastorUserId: data.pastor_user_id,
    pastorName: pastorRow?.full_name ?? '',
    isOnBehalf: data.pastor_user_id !== me.id,
  };
}
