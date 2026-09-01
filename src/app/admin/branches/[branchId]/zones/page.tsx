import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, isOwner, roleLabelKey } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { roleDisplayName } from '@/lib/vocabulary';
import { PageHeading } from '@/components/page-heading';
import type { Zone } from '@/lib/types';
import type { CoordinatorOption } from '@/app/admin/branches/_manager';
import { ZonesManager } from './_manager';

export const dynamic = 'force-dynamic';

export default async function ZonesPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const { user, church } = await requireRole(ADMIN_ROLES);

  // Zones live under branches, which are ministry-only. Guarded here as
  // well as in the actions — the route is reachable by URL even though
  // nothing links to it for churches.
  if (church.organization_type === 'church') redirect('/admin');

  const lang = user.preferred_language;
  const supabase = await createClient();

  // Scope the branch to the caller's church before anything else: a valid
  // uuid from another tenant must 404 rather than leak a name.
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, church_id')
    .eq('id', branchId)
    .eq('church_id', church.id)
    .maybeSingle();
  if (!branch) notFound();

  const [zoneRes, userRes] = await Promise.all([
    supabase.from('zones').select('*').eq('branch_id', branch.id).order('name'),
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .order('full_name'),
  ]);

  const zones = (zoneRes.data ?? []) as Zone[];
  const coordinators: CoordinatorOption[] = (userRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name,
    roleLabel:
      roleDisplayName(u.role, church.organization_type, lang) ??
      t(roleLabelKey(u.role), lang),
  }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-sm text-muted"
      >
        <Link href="/admin/branches" className="hover:text-ink hover:underline">
          {t('zones.breadcrumb_branches', lang)}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate text-body">{branch.name}</span>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-current="page" className="text-ink">
          {t('zones.breadcrumb_zones', lang)}
        </span>
      </nav>

      <PageHeading
        title={t('zones.page_title', lang).replace('{branch_name}', branch.name)}
        subtitle={t('zones.page_subtitle', lang)}
      />

      <ZonesManager
        lang={lang}
        branchId={branch.id}
        branchName={branch.name}
        zones={zones}
        coordinators={coordinators}
        canDelete={isOwner(user.role)}
      />
    </div>
  );
}
