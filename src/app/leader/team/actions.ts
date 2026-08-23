'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type ActionResult = { ok: true } | { ok: false; error: string };

// Lightweight E.164 check: '+' followed by 8–15 digits. Real validation
// is best done via a library like libphonenumber, but this catches the
// obvious typos while the input is optional-format-plus-country-code.
const E164 = /^\+[1-9]\d{7,14}$/;

function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[\s\-()]/g, '');
  return E164.test(stripped) ? stripped : null;
}

async function assertDepartmentOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  departmentId: string,
  userId: string,
  churchId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('departments')
    .select('id, leader_user_id, church_id')
    .eq('id', departmentId)
    .maybeSingle();
  return !!data && data.leader_user_id === userId && data.church_id === churchId;
}

export async function createTeamMember(
  departmentId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user, church } = await requireRole(['department_leader']);
  const supabase = await createClient();

  if (!(await assertDepartmentOwned(supabase, departmentId, user.id, church.id))) {
    return { ok: false, error: 'unauthorized' };
  }

  const full_name = String(formData.get('full_name') ?? '').trim();
  const phoneRaw = String(formData.get('phone') ?? '').trim();
  const role_in_team = String(formData.get('role_in_team') ?? '').trim() || null;
  const photo_url = String(formData.get('photo_url') ?? '').trim() || null;

  if (!full_name) return { ok: false, error: 'name_required' };
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: 'invalid_phone' };

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      department_id: departmentId,
      full_name,
      phone,
      role_in_team,
      photo_url,
      joined_date: new Date().toISOString().slice(0, 10),
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'insert_failed' };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'create',
    entityType: 'team_member',
    entityId: data.id,
    afterValue: { full_name, phone, role_in_team, photo_url },
  });

  revalidatePath('/leader/team');
  revalidatePath('/leader');
  return { ok: true };
}

export async function updateTeamMember(
  memberId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { user, church } = await requireRole(['department_leader']);
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('team_members')
    .select(
      'id, department_id, full_name, phone, role_in_team, photo_url, is_active',
    )
    .eq('id', memberId)
    .maybeSingle();

  if (!before) return { ok: false, error: 'not_found' };
  if (!(await assertDepartmentOwned(supabase, before.department_id, user.id, church.id))) {
    return { ok: false, error: 'unauthorized' };
  }

  const full_name = String(formData.get('full_name') ?? '').trim();
  const phoneRaw = String(formData.get('phone') ?? '').trim();
  const role_in_team = String(formData.get('role_in_team') ?? '').trim() || null;
  const photo_url = String(formData.get('photo_url') ?? '').trim() || null;

  if (!full_name) return { ok: false, error: 'name_required' };
  const phone = normalizePhone(phoneRaw);
  if (!phone) return { ok: false, error: 'invalid_phone' };

  const patch = { full_name, phone, role_in_team, photo_url };
  const { error } = await supabase.from('team_members').update(patch).eq('id', memberId);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: 'update',
    entityType: 'team_member',
    entityId: memberId,
    beforeValue: before,
    afterValue: { ...before, ...patch },
  });

  revalidatePath('/leader/team');
  revalidatePath('/leader');
  return { ok: true };
}

export async function setTeamMemberActive(
  memberId: string,
  active: boolean,
): Promise<ActionResult> {
  const { user, church } = await requireRole(['department_leader']);
  const supabase = await createClient();

  const { data: before } = await supabase
    .from('team_members')
    .select('id, department_id, is_active')
    .eq('id', memberId)
    .maybeSingle();

  if (!before) return { ok: false, error: 'not_found' };
  if (!(await assertDepartmentOwned(supabase, before.department_id, user.id, church.id))) {
    return { ok: false, error: 'unauthorized' };
  }
  if (before.is_active === active) return { ok: true };

  const { error } = await supabase
    .from('team_members')
    .update({ is_active: active })
    .eq('id', memberId);
  if (error) return { ok: false, error: error.message };

  await logAudit({
    churchId: church.id,
    userId: user.id,
    action: active ? 'reactivate' : 'deactivate',
    entityType: 'team_member',
    entityId: memberId,
    beforeValue: { is_active: before.is_active },
    afterValue: { is_active: active },
  });

  revalidatePath('/leader/team');
  revalidatePath('/leader');
  return { ok: true };
}
