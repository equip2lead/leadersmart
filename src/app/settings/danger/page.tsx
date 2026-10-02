import { AlertTriangle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { PurgePanel, type TestDataRow } from './_purge-panel';

export const dynamic = 'force-dynamic';

export default async function DangerZonePage() {
  const { user } = await requireRole(OWNER_ROLES);
  const lang = user.preferred_language;

  // test_data_counts() scopes to the caller's own tenant. Reading
  // test_data_summary here instead would render every tenant's counts — the
  // view has no security_invoker, by design, because its audience is a SQL
  // console rather than a page.
  const supabase = await createClient();
  const { data } = await supabase.rpc('test_data_counts');
  const summary: TestDataRow[] = ((data ?? []) as Array<{
    table_name: string;
    row_count: number;
  }>)
    // Only tables that actually hold fixtures, so the list reads as a thing to
    // act on rather than eight mostly-zero rows.
    .map((r) => ({ table: r.table_name, rows: Number(r.row_count) }))
    .filter((r) => r.rows > 0)
    .sort((a, b) => b.rows - a.rows);

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('owner.danger.title', lang)}
        subtitle={t('owner.danger.subtitle', lang)}
      />

      <PurgePanel lang={lang} summary={summary} />

      {/* The original stub copy, kept: export and account deletion are still
          unbuilt, and removing the notice would imply otherwise. */}
      <div className="card mt-6 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-royal-50 text-indigo-royal-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink">
          {t('nav.owner.comingSoon', lang)}
        </p>
        <p className="mt-2 max-w-md text-sm text-body">
          {t('owner.danger.body', lang)}
        </p>
      </div>
    </div>
  );
}
