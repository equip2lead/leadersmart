import { createClient } from '@/lib/supabase/server';
import type { Me } from '@/lib/auth';
import type { OrganizationType } from '@/lib/types';

export type OnboardingProgress = {
  user_id: string;
  church_id: string;
  org_type_selected_at: string | null;
  church_profile_completed_at: string | null;
  admins_invited_at: string | null;
  admins_skipped_at: string | null;
  departments_created_at: string | null;
  departments_skipped_at: string | null;
  pom_assigned_at: string | null;
  pom_skipped_at: string | null;
  completed_at: string | null;
};

// Reads the current user's onboarding progress. Auto-inserts a row on
// first visit — the wizard needs a row to exist before it can write
// step timestamps, and creating it here means no separate signup-time
// trigger is needed. The insert is a no-op after the first hit.
export async function ensureProgress(me: Me): Promise<OnboardingProgress> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('user_onboarding_progress')
    .select('*')
    .eq('user_id', me.user.id)
    .maybeSingle();
  if (existing) return existing as OnboardingProgress;

  const { data: fresh } = await supabase
    .from('user_onboarding_progress')
    .insert({ user_id: me.user.id, church_id: me.church.id })
    .select('*')
    .single();

  // Fallback — shouldn't happen after the insert unless RLS misfires.
  return (
    fresh ??
    ({
      user_id: me.user.id,
      church_id: me.church.id,
      org_type_selected_at: null,
      church_profile_completed_at: null,
      admins_invited_at: null,
      admins_skipped_at: null,
      departments_created_at: null,
      departments_skipped_at: null,
      pom_assigned_at: null,
      pom_skipped_at: null,
      completed_at: null,
    } satisfies OnboardingProgress)
  );
}

// Which step the wizard should default to based on the progress row.
// If the user has completed church profile but hasn't touched admins,
// they resume at step 2, etc.
//
// Ministries have no step 4, so they cap at 3. Without the cap, a
// ministry that finished step 3 but whose completion write failed would
// be sent to step 4, which bounces to /onboarding, which routes back to
// step 4 — a redirect loop. Capping means the worst case is re-showing
// step 3, where saving again completes the wizard.
export function nextStep(
  p: OnboardingProgress,
  orgType: OrganizationType = 'church',
): 1 | 2 | 3 | 4 {
  if (!p.church_profile_completed_at) return 1;
  if (!p.admins_invited_at && !p.admins_skipped_at) return 2;
  if (!p.departments_created_at && !p.departments_skipped_at) return 3;
  if (orgType === 'ministry') return 3;
  if (!p.pom_assigned_at && !p.pom_skipped_at) return 4;
  return 4;
}
