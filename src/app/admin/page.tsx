import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { ChurchDashboard } from './_components/church-dashboard';
import { MinistryDashboard } from './_components/ministry-dashboard';

export const dynamic = 'force-dynamic';

// Thin router. Auth resolves once here, then the org type decides which
// dashboard renders. Church rendering lives in church-dashboard.tsx,
// unchanged from before the split.
export default async function AdminDashboard() {
  const { user, church } = await requireRole(ADMIN_ROLES);
  return church.organization_type === 'ministry' ? (
    <MinistryDashboard user={user} church={church} />
  ) : (
    <ChurchDashboard user={user} church={church} />
  );
}
