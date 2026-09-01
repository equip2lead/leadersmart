import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, isOwner, roleLabelKey } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { roleDisplayName } from '@/lib/vocabulary';
import { PageHeading } from '@/components/page-heading';
import type { Branch } from '@/lib/types';
import { tallyByBranch } from '@/lib/zones';
import { BranchesManager, type CoordinatorOption } from './_manager';

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
  const { user, church } = await requireRole(ADMIN_ROLES);

  // Branches are a ministry concept in 5a. The sidebar omits the link for
  // churches, but a hidden link is not access control — guard here too,
  // and the server actions refuse independently.
  if (church.organization_type === 'church') redirect('/admin');

  const lang = user.preferred_language;
  const supabase = await createClient();

  const [branchRes, userRes] = await Promise.all([
    supabase
      .from('branches')
      .select('*')
      .eq('church_id', church.id)
      // Headquarters first, then alphabetical — the HQ is the anchor of
      // the list and shouldn't move as branches are added.
      .order('is_headquarters', { ascending: false })
      .order('name'),
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .order('full_name'),
  ]);

  const branches = (branchRes.data ?? []) as Branch[];

  // Zone counts for the cards. Scoped to this org's branch ids, so the
  // query cannot see another tenant's zones even before RLS.
  const { data: zoneRows } = await supabase
    .from('zones')
    .select('branch_id')
    .in('branch_id', branches.length ? branches.map((b) => b.id) : ['']);
  const zoneCounts = tallyByBranch(zoneRows ?? []);

  const coordinators: CoordinatorOption[] = (userRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name,
    // Ministry vocabulary where it exists (admin_pastor reads as
    // "Admin Leader"), otherwise the stored role's own label.
    roleLabel:
      roleDisplayName(u.role, church.organization_type, lang) ??
      t(roleLabelKey(u.role), lang),
  }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('branches.page_title', lang)}
        subtitle={t('branches.page_subtitle', lang)}
      />
      <BranchesManager
        lang={lang}
        branches={branches}
        coordinators={coordinators}
        zoneCounts={zoneCounts}
        canDelete={isOwner(user.role)}
      />
    </div>
  );
}
