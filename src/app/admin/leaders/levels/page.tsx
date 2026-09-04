import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { pickLang } from '@/lib/leaders';
import type {
  LevelCompetency,
  LevelDefinition,
  LevelMaterial,
  LevelMilestone,
} from '@/lib/types';
import type { RequirementRow } from './_requirements';
import { LevelsManager } from './_manager';

export const dynamic = 'force-dynamic';

export default async function LevelDefinitionsPage() {
  const { user, church } = await requireRole(ADMIN_ROLES);
  const lang = user.preferred_language;
  const supabase = await createClient();

  // Every org was seeded with five levels, so this should always return
  // five rows. If a seed were ever missed the manager renders whatever
  // exists rather than assuming.
  const { data } = await supabase
    .from('level_definitions')
    .select('*')
    .eq('church_id', church.id)
    .order('level');

  const definitions = (data ?? []) as LevelDefinition[];
  const defIds = definitions.map((d) => d.id);

  // All three requirement tables for every level in one round trip each,
  // then grouped in memory — five levels times three tables would
  // otherwise be fifteen queries.
  const [compRes, matRes, mileRes] = await Promise.all([
    supabase
      .from('level_competencies')
      .select('*')
      .in('level_definition_id', defIds.length ? defIds : [''])
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('level_materials')
      .select('*')
      .in('level_definition_id', defIds.length ? defIds : [''])
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('level_milestones')
      .select('*')
      .in('level_definition_id', defIds.length ? defIds : [''])
      .order('sort_order')
      .order('created_at'),
  ]);

  // Flatten name/title into a single `label` so the shared section
  // component never has to know which table a row came from.
  function group<T extends { level_definition_id: string }>(
    rows: T[],
    toRow: (r: T) => RequirementRow,
  ): Record<string, RequirementRow[]> {
    const out: Record<string, RequirementRow[]> = {};
    for (const id of defIds) out[id] = [];
    for (const r of rows) (out[r.level_definition_id] ??= []).push(toRow(r));
    return out;
  }

  const competencies = group((compRes.data ?? []) as LevelCompetency[], (r) => ({
    id: r.id,
    label: r.name,
    description: r.description,
    displayLabel: pickLang(r.name, r.name_fr, lang) ?? r.name,
    displayDescription: pickLang(r.description, r.description_fr, lang),
    sortOrder: r.sort_order,
  }));
  const materials = group((matRes.data ?? []) as LevelMaterial[], (r) => ({
    id: r.id,
    label: r.title,
    description: r.description,
    displayLabel: pickLang(r.title, r.title_fr, lang) ?? r.title,
    displayDescription: pickLang(r.description, r.description_fr, lang),
    sortOrder: r.sort_order,
    materialType: r.material_type,
    url: r.url,
  }));
  const milestones = group((mileRes.data ?? []) as LevelMilestone[], (r) => ({
    id: r.id,
    label: r.name,
    description: r.description,
    displayLabel: pickLang(r.name, r.name_fr, lang) ?? r.name,
    displayDescription: pickLang(r.description, r.description_fr, lang),
    sortOrder: r.sort_order,
  }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href="/admin/leaders"
        className="text-sm font-medium text-muted hover:text-ink"
      >
        {t('levels.definitions.back_link', lang)}
      </Link>
      <div className="mt-4">
        <PageHeading
          title={t('levels.definitions.page_title', lang)}
          subtitle={t('levels.definitions.page_subtitle', lang)}
        />
      </div>
      <LevelsManager
        lang={lang}
        definitions={definitions}
        competencies={competencies}
        materials={materials}
        milestones={milestones}
      />
    </div>
  );
}
