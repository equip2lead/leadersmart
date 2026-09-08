'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { resolveLessonAccess } from '@/lib/lesson-access';
import { logAudit } from '@/lib/audit';
import {
  MAX_RESPONSE_LENGTH,
  MAX_REVIEWER_COMMENT,
} from '@/lib/assignment-limits';
import type { AssignmentResponse } from '@/lib/types';

// Server actions behind the lesson viewer and the mentor review dashboard.
//
// Every write here goes through the caller's own Supabase session, so RLS is
// the last word on whether it lands. The explicit checks in front of each one
// exist to turn a policy refusal — which arrives as "0 rows updated", not an
// error — into a named result the UI can translate.

export type AssignmentResult =
  | { ok: true; response: AssignmentResponse }
  | { ok: false; error: string };

export type ReviewResult = { ok: true } | { ok: false; error: string };

/**
 * The current row for a lesson: the highest version.
 *
 * Submitted and reviewed versions are frozen (see the versioning migration),
 * so history stacks up underneath and only the top row is live.
 */
async function currentResponse(
  leaderDevelopmentId: string,
  materialId: string,
): Promise<AssignmentResponse | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('assignment_responses')
    .select('*')
    .eq('leader_development_id', leaderDevelopmentId)
    .eq('material_id', materialId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AssignmentResponse | null) ?? null;
}

/**
 * Write a response at the given status.
 *
 * The two entry points below differ only in the status they land on, and both
 * face the same branch: an open draft is edited in place, anything else is
 * superseded by a new version. That branch is the whole point of the
 * versioning scheme — a submitted answer is a record of what the leader said
 * at that moment, so revising it means saying something new, not editing the
 * past.
 */
async function writeResponse(
  leaderDevelopmentId: string,
  materialId: string,
  responseText: string,
  status: 'draft' | 'submitted',
): Promise<AssignmentResult> {
  const me = await getMe();

  const access = await resolveLessonAccess(me.user, leaderDevelopmentId, materialId);
  if (!access) return { ok: false, error: 'not_allowed' };
  if (!access.material.assignment_prompt) {
    return { ok: false, error: 'no_assignment' };
  }

  const text = responseText.trim();
  if (text.length === 0) return { ok: false, error: 'empty_response' };
  if (text.length > MAX_RESPONSE_LENGTH) return { ok: false, error: 'too_long' };

  const supabase = await createClient();
  const now = new Date().toISOString();
  const current = await currentResponse(leaderDevelopmentId, materialId);

  let row: AssignmentResponse | null = null;

  if (current && current.status === 'draft') {
    const { data, error } = await supabase
      .from('assignment_responses')
      .update({
        response_text: text,
        status,
        // submitted_at is NOT NULL with a default, so a draft already carries
        // one from creation. It only becomes meaningful on submit, which is
        // when it gets stamped for real.
        ...(status === 'submitted' ? { submitted_at: now } : {}),
      })
      .eq('id', current.id)
      .select('*')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    row = data as AssignmentResponse | null;
  } else {
    const { data, error } = await supabase
      .from('assignment_responses')
      .insert({
        leader_development_id: leaderDevelopmentId,
        material_id: materialId,
        response_text: text,
        status,
        version: (current?.version ?? 0) + 1,
        submitted_at: now,
      })
      .select('*')
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    row = data as AssignmentResponse | null;
  }

  // No error and no row means RLS filtered the write silently — the only
  // shape a policy refusal takes on an authenticated client.
  if (!row) return { ok: false, error: 'not_allowed' };

  revalidatePath(`/admin/leaders/${leaderDevelopmentId}/lesson/${materialId}`);
  if (status === 'submitted') revalidatePath('/admin/leaders/submissions');

  return { ok: true, response: row };
}

export async function saveAssignmentDraft(
  leaderDevelopmentId: string,
  materialId: string,
  responseText: string,
): Promise<AssignmentResult> {
  return writeResponse(leaderDevelopmentId, materialId, responseText, 'draft');
}

export async function submitAssignmentResponse(
  leaderDevelopmentId: string,
  materialId: string,
  responseText: string,
): Promise<AssignmentResult> {
  return writeResponse(leaderDevelopmentId, materialId, responseText, 'submitted');
}

/**
 * Record a mentor's verdict on a submitted response.
 *
 * Approve and send-back land on the same row state — status 'reviewed', with a
 * comment — because the schema has no third verdict to distinguish them. What
 * separates them is what each one implies: send-back demands a comment,
 * since there is nothing for the leader to act on without one, and leaves the
 * requirement open; approve makes the comment optional and marks the
 * requirement complete.
 */
async function recordReview(
  responseId: string,
  reviewerComment: string,
  opts: { requireComment: boolean; completeRequirement: boolean },
): Promise<ReviewResult> {
  const me = await getMe();
  if (!canReviewAssignments(me.user.role)) {
    return { ok: false, error: 'not_allowed' };
  }

  const comment = reviewerComment.trim();
  if (opts.requireComment && comment.length === 0) {
    return { ok: false, error: 'comment_required' };
  }
  if (comment.length > MAX_REVIEWER_COMMENT) {
    return { ok: false, error: 'comment_too_long' };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('assignment_responses')
    .select('*')
    .eq('id', responseId)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'not_found' };
  const response = existing as AssignmentResponse;

  // Tenant check. RLS scopes the read to this church already, but the write
  // below and the leader_progress write after it both need the pipeline row
  // anyway, so fetching it doubles as the app-side guard.
  const { data: entry } = await supabase
    .from('leader_development')
    .select('id, church_id, user_id')
    .eq('id', response.leader_development_id)
    .eq('church_id', me.church.id)
    .maybeSingle();
  if (!entry) return { ok: false, error: 'not_found' };

  if (response.status !== 'submitted') {
    return { ok: false, error: 'not_submitted' };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('assignment_responses')
    .update({
      status: 'reviewed',
      // An approval with nothing to say stores NULL rather than an empty
      // string, so "has feedback" is a single null check everywhere.
      reviewer_comment: comment || null,
      reviewed_by: me.user.id,
      reviewed_at: now,
    })
    .eq('id', responseId)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!updated) return { ok: false, error: 'not_allowed' };

  // Approving the assignment for a lesson completes that lesson's material
  // requirement. This is the only requirement an assignment response points
  // at — assignment_responses.material_id is a material FK, and nothing in
  // the schema relates a response to a competency — so competencies are left
  // to the mentor's own toggle on the leader detail page.
  //
  // Best-effort, and deliberately after the review has already landed: a
  // failed progress write must not undo a recorded verdict.
  if (opts.completeRequirement) {
    await supabase.from('leader_progress').upsert(
      {
        leader_development_id: response.leader_development_id,
        requirement_type: 'material',
        requirement_id: response.material_id,
        status: 'completed',
        completed_at: now,
        updated_at: now,
        updated_by: me.user.id,
      },
      { onConflict: 'leader_development_id,requirement_type,requirement_id' },
    );
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'assignment_response',
    entityId: responseId,
    beforeValue: { status: response.status },
    afterValue: {
      status: 'reviewed',
      approved: opts.completeRequirement,
      has_comment: comment.length > 0,
    },
  });

  revalidatePath('/admin/leaders/submissions');
  revalidatePath(
    `/admin/leaders/${response.leader_development_id}/lesson/${response.material_id}`,
  );
  revalidatePath(`/admin/leaders/${response.leader_development_id}`);
  return { ok: true };
}

export async function reviewAssignmentResponse(
  responseId: string,
  reviewerComment: string,
): Promise<ReviewResult> {
  return recordReview(responseId, reviewerComment, {
    requireComment: false,
    completeRequirement: true,
  });
}

export async function sendBackForRevision(
  responseId: string,
  reviewerComment: string,
): Promise<ReviewResult> {
  // No completeRequirement: work sent back is, by definition, not done.
  return recordReview(responseId, reviewerComment, {
    requireComment: true,
    completeRequirement: false,
  });
}
