'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { ADMIN_ROLES, isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { MAX_LEADER_LEVEL } from '@/lib/types';

export type LeaderResult = { ok: true } | { ok: false; error: string };

const MAX_NOTES = 500;

// The only unique constraint on the table is (church_id, user_id), so a
// 23505 here always means the person is already in the pipeline. Letting
// the database arbitrate avoids the race a read-then-write check leaves
// open.
const PG_UNIQUE_VIOLATION = '23505';

async function requireLeaderAdmin() {
  const me = await getMe();
  if (!ADMIN_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_admin' as const };
  }
  if (me.church.organization_type !== 'ministry') {
    return { me: null, error: 'not_a_ministry' as const };
  }
  return { me, error: null };
}

function validLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEADER_LEVEL;
}

// RLS scopes the pipeline row by church_id but not the user it points at,
// so a user_id from another tenant has to be rejected here — the same
// cross-tenant guard branches and zones use.
async function userInOrg(userId: string, churchId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id, church_id')
    .eq('id', userId)
    .maybeSingle();
  return !!data && data.church_id === churchId;
}

// Loads a pipeline row and proves it belongs to the caller's church.
async function ownedEntry(id: string, churchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('leader_development')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!data || data.church_id !== churchId) return null;
  return data;
}

function revalidateAll() {
  revalidatePath('/admin/leaders');
  revalidatePath('/admin');
}

export async function addLeader(input: {
  userId: string;
  startingLevel: number;
  notes: string;
}): Promise<LeaderResult> {
  const { me, error } = await requireLeaderAdmin();
  if (!me) return { ok: false, error };

  if (!input.userId) return { ok: false, error: 'name_required' };
  if (!validLevel(input.startingLevel)) return { ok: false, error: 'invalid_level' };
  if (input.notes.trim().length > MAX_NOTES) {
    return { ok: false, error: 'notes_too_long' };
  }
  if (!(await userInOrg(input.userId, me.church.id))) {
    return { ok: false, error: 'invalid_user' };
  }

  const supabase = await createClient();
  const { data, error: insErr } = await supabase
    .from('leader_development')
    .insert({
      church_id: me.church.id,
      user_id: input.userId,
      current_level: input.startingLevel,
      notes: input.notes.trim() || null,
      created_by: me.user.id,
    })
    .select('id, current_level')
    .single();

  if (insErr) {
    return {
      ok: false,
      error:
        insErr.code === PG_UNIQUE_VIOLATION ? 'already_tracked' : insErr.message,
    };
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: 'leader_development',
    entityId: data.id,
    afterValue: {
      user_id: input.userId,
      current_level: data.current_level,
      notes: input.notes.trim() || null,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function updateLeaderLevel(
  id: string,
  newLevel: number,
): Promise<LeaderResult> {
  const { me, error } = await requireLeaderAdmin();
  if (!me) return { ok: false, error };
  if (!validLevel(newLevel)) return { ok: false, error: 'invalid_level' };

  const before = await ownedEntry(id, me.church.id);
  if (!before) return { ok: false, error: 'not_found' };

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('leader_development')
    .update({
      current_level: newLevel,
      // Only stamp the level-change clock when the level actually moved,
      // so re-selecting the current level doesn't reset the history.
      ...(before.current_level === newLevel ? {} : { last_level_change_at: now }),
      updated_at: now,
    })
    .eq('id', id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'leader_development',
    entityId: id,
    beforeValue: { current_level: before.current_level },
    afterValue: { current_level: newLevel },
  });

  revalidateAll();
  return { ok: true };
}

export async function updateLeaderNotes(
  id: string,
  notes: string,
): Promise<LeaderResult> {
  const { me, error } = await requireLeaderAdmin();
  if (!me) return { ok: false, error };
  if (notes.trim().length > MAX_NOTES) {
    return { ok: false, error: 'notes_too_long' };
  }

  const before = await ownedEntry(id, me.church.id);
  if (!before) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('leader_development')
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'leader_development',
    entityId: id,
    beforeValue: { notes: before.notes },
    afterValue: { notes: notes.trim() || null },
  });

  revalidateAll();
  return { ok: true };
}

// Soft removal. The row stays so the history survives, and the same
// action flips it back — a leader who pauses for a season shouldn't have
// to be re-added from scratch.
export async function setLeaderActive(
  id: string,
  isActive: boolean,
): Promise<LeaderResult> {
  const { me, error } = await requireLeaderAdmin();
  if (!me) return { ok: false, error };

  const before = await ownedEntry(id, me.church.id);
  if (!before) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { error: upErr } = await supabase
    .from('leader_development')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: isActive ? 'reactivate' : 'deactivate',
    entityType: 'leader_development',
    entityId: id,
    beforeValue: { is_active: before.is_active },
    afterValue: { is_active: isActive },
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteLeader(id: string): Promise<LeaderResult> {
  const { me, error } = await requireLeaderAdmin();
  if (!me) return { ok: false, error };

  // Owner-only, matching leader_development_delete. Checked here too so
  // a non-owner gets a named error rather than a zero-row delete that
  // reads as success.
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const before = await ownedEntry(id, me.church.id);
  if (!before) return { ok: false, error: 'not_found' };

  const supabase = await createClient();
  const { error: delErr } = await supabase
    .from('leader_development')
    .delete()
    .eq('id', id);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'leader_development',
    entityId: id,
    beforeValue: {
      user_id: before.user_id,
      current_level: before.current_level,
      is_active: before.is_active,
    },
    afterValue: { deleted: true },
  });

  revalidateAll();
  return { ok: true };
}
