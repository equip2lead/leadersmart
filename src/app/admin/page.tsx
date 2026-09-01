import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { ChurchDashboard } from './_components/church-dashboard';

export const dynamic = 'force-dynamic';

// Thin router. Auth resolves once here, then the org type decides which
// dashboard renders. Church rendering lives in church-dashboard.tsx
// unchanged; the ministry view arrives in the next commit.
export default async function AdminDashboard() {
  const { user, church } = await requireRole(ADMIN_ROLES);
  return <ChurchDashboard user={user} church={church} />;
}
