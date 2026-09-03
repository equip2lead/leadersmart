'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export type LevelResult = { ok: true } | { ok: false; error: string };

const MAX_TITLE = 80;
const MAX_DESCRIPTION = 500;

// Level content is available to churches and ministries alike — the
// pipeline reached parity in 7412cef, so there is no org-type gate here.
export async function requireLevelAdmin() {
  const me = await getMe();
  if (!ADMIN_ROLES.includes(me.user.role)) {
    return { me: null, error: 'not_admin' as const };
  }
  return { me, error: null };
}

export async function updateLevelDefinition(input: {
  id: string;
  title: string;
  description: string;
}): Promise<LevelResult> {
  const { me, error } = await requireLevelAdmin();
  if (!me) return { ok: false, error };

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'title_required' };
  if (title.length > MAX_TITLE) return { ok: false, error: 'title_too_long' };
  if (input.description.trim().length > MAX_DESCRIPTION) {
    return { ok: false, error: 'description_too_long' };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from('level_definitions')
    .select('*')
    .eq('id', input.id)
    .maybeSingle();
  if (!before || before.church_id !== me.church.id) {
    return { ok: false, error: 'not_found' };
  }

  const { error: upErr } = await supabase
    .from('level_definitions')
    .update({
      title,
      description: input.description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'level_definition',
    entityId: input.id,
    beforeValue: { title: before.title, description: before.description },
    afterValue: { title, description: input.description.trim() || null },
  });

  revalidatePath('/admin/leaders/levels');
  revalidatePath('/admin/leaders');
  return { ok: true };
}
