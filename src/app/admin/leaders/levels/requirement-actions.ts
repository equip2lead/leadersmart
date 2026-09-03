'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { MATERIAL_TYPES } from '@/lib/types';
import type { MaterialType, RequirementType } from '@/lib/types';
import { requireLevelAdmin } from './actions';

export type RequirementResult = { ok: true } | { ok: false; error: string };

const MAX_LABEL = 120;
const MAX_DESCRIPTION = 500;
const MAX_URL = 500;

// The three requirement tables are the same shape apart from the label
// column and the two material-only fields, so one set of actions drives
// all three rather than three near-identical copies.
const TABLES: Record<
  RequirementType,
  { table: string; labelColumn: 'name' | 'title'; entityType: string }
> = {
  competency: {
    table: 'level_competencies',
    labelColumn: 'name',
    entityType: 'level_competency',
  },
  material: {
    table: 'level_materials',
    labelColumn: 'title',
    entityType: 'level_material',
  },
  milestone: {
    table: 'level_milestones',
    labelColumn: 'name',
    entityType: 'level_milestone',
  },
};

export type RequirementInput = {
  type: RequirementType;
  levelDefinitionId: string;
  label: string;
  description: string;
  materialType?: MaterialType;
  url?: string;
};

function validate(input: RequirementInput): string | null {
  const label = input.label.trim();
  if (!label) return 'label_required';
  if (label.length > MAX_LABEL) return 'label_too_long';
  if (input.description.trim().length > MAX_DESCRIPTION) {
    return 'description_too_long';
  }
  if (input.type === 'material') {
    if (!input.materialType || !MATERIAL_TYPES.includes(input.materialType)) {
      return 'invalid_material_type';
    }
    const url = (input.url ?? '').trim();
    if (url) {
      if (url.length > MAX_URL) return 'url_too_long';
      // Only http(s). A javascript: or data: URL rendered as a link is an
      // XSS vector, and these are shown to every leader in the org.
      if (!/^https?:\/\//i.test(url)) return 'invalid_url';
    }
  }
  return null;
}

// The requirement tables have no church_id — tenancy comes from the
// parent level_definition. Every write proves that parent belongs to the
// caller before touching a row.
async function ownedDefinition(levelDefinitionId: string, churchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('level_definitions')
    .select('id, level, church_id')
    .eq('id', levelDefinitionId)
    .maybeSingle();
  if (!data || data.church_id !== churchId) return null;
  return data;
}

export async function createRequirement(
  input: RequirementInput,
): Promise<RequirementResult> {
  const { me, error } = await requireLevelAdmin();
  if (!me) return { ok: false, error };

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const def = await ownedDefinition(input.levelDefinitionId, me.church.id);
  if (!def) return { ok: false, error: 'not_found' };

  const cfg = TABLES[input.type];
  const supabase = await createClient();

  // Append to the end of the list. Reading the current max is enough:
  // sort_order only has to be monotonic within a level, and two admins
  // adding at once would produce a tie, not a crash.
  const { data: last } = await supabase
    .from(cfg.table)
    .select('sort_order')
    .eq('level_definition_id', input.levelDefinitionId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row: Record<string, unknown> = {
    level_definition_id: input.levelDefinitionId,
    [cfg.labelColumn]: input.label.trim(),
    description: input.description.trim() || null,
    sort_order: (last?.sort_order ?? -1) + 1,
  };
  if (input.type === 'material') {
    row.material_type = input.materialType;
    row.url = (input.url ?? '').trim() || null;
  }

  const { data, error: insErr } = await supabase
    .from(cfg.table)
    .insert(row)
    .select('id')
    .single();
  if (insErr || !data) {
    return { ok: false, error: insErr?.message ?? 'insert_failed' };
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'create',
    entityType: cfg.entityType,
    entityId: data.id,
    afterValue: { ...row, level: def.level },
  });

  revalidatePath('/admin/leaders/levels');
  return { ok: true };
}

export async function updateRequirement(
  input: RequirementInput & { id: string },
): Promise<RequirementResult> {
  const { me, error } = await requireLevelAdmin();
  if (!me) return { ok: false, error };

  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const cfg = TABLES[input.type];
  const supabase = await createClient();

  const { data: before } = await supabase
    .from(cfg.table)
    .select('*')
    .eq('id', input.id)
    .maybeSingle();
  if (!before) return { ok: false, error: 'not_found' };
  if (!(await ownedDefinition(before.level_definition_id, me.church.id))) {
    return { ok: false, error: 'not_found' };
  }

  const patch: Record<string, unknown> = {
    [cfg.labelColumn]: input.label.trim(),
    description: input.description.trim() || null,
  };
  if (input.type === 'material') {
    patch.material_type = input.materialType;
    patch.url = (input.url ?? '').trim() || null;
  }

  const { error: upErr } = await supabase
    .from(cfg.table)
    .update(patch)
    .eq('id', input.id);
  if (upErr) return { ok: false, error: upErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: cfg.entityType,
    entityId: input.id,
    beforeValue: {
      label: before[cfg.labelColumn],
      description: before.description,
    },
    afterValue: patch,
  });

  revalidatePath('/admin/leaders/levels');
  return { ok: true };
}

export async function deleteRequirement(
  type: RequirementType,
  id: string,
): Promise<RequirementResult> {
  const { me, error } = await requireLevelAdmin();
  if (!me) return { ok: false, error };

  const cfg = TABLES[type];
  const supabase = await createClient();

  const { data: before } = await supabase
    .from(cfg.table)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!before) return { ok: false, error: 'not_found' };
  if (!(await ownedDefinition(before.level_definition_id, me.church.id))) {
    return { ok: false, error: 'not_found' };
  }

  // Any leader_progress rows pointing here are removed by the AFTER
  // DELETE trigger installed with the schema — requirement_id is
  // polymorphic and cannot cascade on its own.
  const { error: delErr } = await supabase.from(cfg.table).delete().eq('id', id);
  if (delErr) return { ok: false, error: delErr.message };

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: cfg.entityType,
    entityId: id,
    beforeValue: { label: before[cfg.labelColumn] },
    afterValue: { deleted: true },
  });

  revalidatePath('/admin/leaders/levels');
  return { ok: true };
}

// Swaps a row with its neighbour in the given direction. Swapping two
// sort_order values is stable regardless of gaps or ties in the sequence,
// which a "decrement by one" approach is not.
export async function moveRequirement(
  type: RequirementType,
  id: string,
  direction: 'up' | 'down',
): Promise<RequirementResult> {
  const { me, error } = await requireLevelAdmin();
  if (!me) return { ok: false, error };

  const cfg = TABLES[type];
  const supabase = await createClient();

  const { data: current } = await supabase
    .from(cfg.table)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!current) return { ok: false, error: 'not_found' };
  if (!(await ownedDefinition(current.level_definition_id, me.church.id))) {
    return { ok: false, error: 'not_found' };
  }

  const { data: siblings } = await supabase
    .from(cfg.table)
    .select('id, sort_order')
    .eq('level_definition_id', current.level_definition_id)
    .order('sort_order')
    .order('created_at');
  const list = siblings ?? [];
  const index = list.findIndex((r) => r.id === id);
  const swapWith = direction === 'up' ? list[index - 1] : list[index + 1];
  // Already at the end of the list — nothing to do, and not an error.
  if (!swapWith) return { ok: true };

  await supabase
    .from(cfg.table)
    .update({ sort_order: swapWith.sort_order })
    .eq('id', id);
  await supabase
    .from(cfg.table)
    .update({ sort_order: current.sort_order })
    .eq('id', swapWith.id);

  revalidatePath('/admin/leaders/levels');
  return { ok: true };
}
