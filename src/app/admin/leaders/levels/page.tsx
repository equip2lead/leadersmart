import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import type { LevelDefinition } from '@/lib/types';
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
      <LevelsManager lang={lang} definitions={definitions} />
    </div>
  );
}
