import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { getVocab, eventTypesFor } from '@/lib/vocabulary';
import type { AppLanguage, Branch, Church, Department } from '@/lib/types';
import type { ScopeOption } from './_event-form';

// Everything the create and edit forms need that depends on org type, in one
// place so the two pages cannot answer the question differently.
//
// A ministry scopes an event to a branch; a church to a department. The two
// are never offered together — the events_scope_is_one_of CHECK would reject
// the combination, so the form must not be able to produce it.

export type EventFormContext = {
  scopeKind: 'branch' | 'department';
  scopeOptions: ScopeOption[];
  scopeLabel: string;
  people: ScopeOption[];
  eventTypes: readonly string[];
};

export async function loadEventFormContext(
  church: Church,
  lang: AppLanguage,
  /** The event's stored type when editing, so a value the org's current list
      no longer offers is still selectable. */
  currentType?: string | null,
): Promise<EventFormContext> {
  const supabase = await createClient();
  const isMinistry = church.organization_type !== 'church';
  const v = getVocab(church.organization_type, lang);

  const [scopeRes, peopleRes] = await Promise.all([
    isMinistry
      ? supabase
          .from('branches')
          .select('id, name')
          .eq('church_id', church.id)
          .order('is_headquarters', { ascending: false })
          .order('name')
      : supabase
          .from('departments')
          .select('id, name')
          .eq('church_id', church.id)
          .eq('is_active', true)
          .order('display_order')
          .order('name'),
    // Active members only: a deactivated user should not be assignable as the
    // person responsible for something in the future.
    supabase
      .from('users')
      .select('id, full_name')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .order('full_name'),
  ]);

  const scopeRows = (scopeRes.data ?? []) as Array<
    Pick<Branch, 'id' | 'name'> | Pick<Department, 'id' | 'name'>
  >;

  return {
    scopeKind: isMinistry ? 'branch' : 'department',
    scopeOptions: scopeRows.map((r) => ({ id: r.id, name: r.name })),
    // The church-side label uses the org's own word for the unit, so a
    // ministry that calls them teams does not read "Department".
    scopeLabel: isMinistry
      ? t('events.form.branch_scope_label', lang)
      : `${v.department} (${t('events.form.time_optional', lang).toLowerCase()})`,
    people: (peopleRes.data ?? []).map((p) => ({
      id: p.id as string,
      name: p.full_name as string,
    })),
    eventTypes: eventTypesFor(church.organization_type, currentType),
  };
}
