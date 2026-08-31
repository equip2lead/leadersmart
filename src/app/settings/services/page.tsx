import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import type { ChurchService } from '@/lib/types';
import { ServicesManager } from './_form';

export const dynamic = 'force-dynamic';

export default async function ServiceTimesPage() {
  const { user, church } = await requireRole(ADMIN_ROLES);

  // Ministries don't run a weekly service schedule, so the page is hidden
  // from their sidebar. Guard here too — a hidden link is not access
  // control, and a bookmark or a stale tab would otherwise reach it.
  if (church.organization_type !== 'church') redirect('/settings');

  const lang = user.preferred_language;
  const supabase = await createClient();

  const { data } = await supabase
    .from('church_services')
    .select('*')
    .eq('church_id', church.id)
    .order('day_of_week')
    .order('start_time');

  const services = (data ?? []) as ChurchService[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeading
        title={t('settings.services.title', lang)}
        subtitle={t('settings.services.subtitle', lang)}
      />
      <div className="mt-8">
        <ServicesManager lang={lang} initial={services} />
      </div>
    </div>
  );
}
