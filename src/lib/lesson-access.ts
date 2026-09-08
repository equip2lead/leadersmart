import { createClient } from '@/lib/supabase/server';
import { canReviewAssignments } from '@/lib/roles';
import type { LeaderDevelopment, LevelMaterial, User } from '@/lib/types';

// Who may open a lesson, resolved once and reused by the page and by every
// server action behind it.
//
// This is the app-side half of a two-layer guard. RLS already refuses the
// rows; this exists so the refusal happens as a redirect on a route the user
// was never meant to reach, rather than as a page that renders empty. Neither
// layer is allowed to be the only one.

export type LessonAccess = {
  entry: LeaderDevelopment;
  material: LevelMaterial;
  level: number;
  /** True when the viewer is the leader whose pipeline this is. Drives write
      access to the assignment: a mentor reads and reviews, the leader writes. */
  isOwnEntry: boolean;
  /** Owner / admin pastor — may open any leader's lesson in this church. */
  canReview: boolean;
};

/**
 * Resolve a (leaderId, materialId) pair for `user`, or return null.
 *
 * Null covers every failure identically — wrong church, unknown id, no
 * lesson on the material, viewer is neither the leader nor a mentor — so the
 * caller cannot accidentally leak which of those it was. A leader from
 * another tenant must be indistinguishable from one that does not exist.
 */
export async function resolveLessonAccess(
  user: User,
  leaderId: string,
  materialId: string,
): Promise<LessonAccess | null> {
  const supabase = await createClient();

  const { data: entryRow } = await supabase
    .from('leader_development')
    .select('*')
    .eq('id', leaderId)
    .eq('church_id', user.church_id)
    .maybeSingle();
  if (!entryRow) return null;
  const entry = entryRow as LeaderDevelopment;

  const isOwnEntry = entry.user_id === user.id;
  const canReview = canReviewAssignments(user.role);
  if (!isOwnEntry && !canReview) return null;

  const { data: materialRow } = await supabase
    .from('level_materials')
    .select('*')
    .eq('id', materialId)
    .maybeSingle();
  if (!materialRow) return null;
  const material = materialRow as LevelMaterial;

  // has_lesson is the switch, not lesson_content — a material still being
  // drafted has text but no lesson, and must not be reachable by URL.
  if (!material.has_lesson) return null;

  // level_materials carries no church_id of its own, so the tenant check has
  // to hop through the level definition. Without this, a material id from
  // another church would render inside this church's chrome.
  const { data: def } = await supabase
    .from('level_definitions')
    .select('id, level, church_id')
    .eq('id', material.level_definition_id)
    .maybeSingle();
  if (!def || def.church_id !== user.church_id) return null;

  return { entry, material, level: def.level as number, isOwnEntry, canReview };
}
