'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { PROGRESS_STATUSES } from '@/lib/types';
import type { ProgressStatus, RequirementType } from '@/lib/types';

export type ProgressResult = { ok: true } | { ok: false; error: string };

const MAX_NOTES = 500;

const REQUIREMENT_TABLES: Record<RequirementType, string> = {
  competency: 'level_competencies',
  material: 'level_materials',
  milestone: 'level_milestones',
};

async function requireProgressAdmin() {
  const me = await getMe();
  if (!ADMIN_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_admin' as const };
  }
  return { me, error: null };
}

// Both the pipeline entry and the requirement have to belong to the
// caller's church. RLS covers the progress row itself, but requirement_id
// is polymorphic and unconstrained, so a requirement from another tenant
// would otherwise be accepted.
async function assertOwned(
  leaderDevelopmentId: string,
  requirementType: RequirementType,
  requirementId: string,
  churchId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: leader } = await supabase
    .from('leader_development')
    .select('id, church_id')
    .eq('id', leaderDevelopmentId)
    .maybeSingle();
  if (!leader || leader.church_id !== churchId) return false;

  const { data: req } = await supabase
    .from(REQUIREMENT_TABLES[requirementType])
    .select('id, level_definition_id')
    .eq('id', requirementId)
    .maybeSingle();
  if (!req) return false;

  const { data: def } = await supabase
    .from('level_definitions')
    .select('id, church_id')
    .eq('id', req.level_definition_id)
    .maybeSingle();
  return !!def && def.church_id === churchId;
}

// Progress rows are created lazily: a requirement with no row is simply
// "not started". The first status change upserts one, keyed on the unique
// (leader_development_id, requirement_type, requirement_id) triple.
export async function setProgressStatus(input: {
  leaderDevelopmentId: string;
  requirementType: RequirementType;
  requirementId: string;
  status: ProgressStatus;
}): Promise<ProgressResult> {
  const { me, error } = await requireProgressAdmin();
  if (!me) return { ok: false, error };

  if (!PROGRESS_STATUSES.includes(input.status)) {
    return { ok: false, error: 'invalid_status' };
  }
  if (
    !(await assertOwned(
      input.leaderDevelopmentId,
      input.requirementType,
      input.requirementId,
      me.church.id,
    ))
  ) {
    return { ok: false, error: 'invalid_requirement' };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error: upErr } = await supabase.from('leader_progress').upsert(
    {
      leader_development_id: input.leaderDevelopmentId,
      requirement_type: input.requirementType,
      requirement_id: input.requirementId,
      status: input.status,
      // Cleared when moving back off completed, so the timestamp never
      // claims a completion that was undone.
      completed_at: input.status === 'completed' ? now : null,
      updated_at: now,
      updated_by: me.user.id,
    },
    { onConflict: 'leader_development_id,requirement_type,requirement_id' },
  );
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'leader_progress',
    entityId: input.requirementId,
    afterValue: {
      leader_development_id: input.leaderDevelopmentId,
      requirement_type: input.requirementType,
      status: input.status,
    },
  });

  revalidatePath(`/admin/leaders/${input.leaderDevelopmentId}`);
  revalidatePath('/admin/leaders');
  return { ok: true };
}

export async function setProgressNotes(input: {
  leaderDevelopmentId: string;
  requirementType: RequirementType;
  requirementId: string;
  notes: string;
}): Promise<ProgressResult> {
  const { me, error } = await requireProgressAdmin();
  if (!me) return { ok: false, error };

  if (input.notes.trim().length > MAX_NOTES) {
    return { ok: false, error: 'notes_too_long' };
  }
  if (
    !(await assertOwned(
      input.leaderDevelopmentId,
      input.requirementType,
      input.requirementId,
      me.church.id,
    ))
  ) {
    return { ok: false, error: 'invalid_requirement' };
  }

  const supabase = await createClient();
  // Upsert without touching status: a note can be added before any
  // status change, and the default keeps it "not started".
  const { error: upErr } = await supabase.from('leader_progress').upsert(
    {
      leader_development_id: input.leaderDevelopmentId,
      requirement_type: input.requirementType,
      requirement_id: input.requirementId,
      notes: input.notes.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: me.user.id,
    },
    { onConflict: 'leader_development_id,requirement_type,requirement_id' },
  );
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath(`/admin/leaders/${input.leaderDevelopmentId}`);
  return { ok: true };
}
