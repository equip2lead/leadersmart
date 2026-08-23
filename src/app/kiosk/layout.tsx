import { requireRole } from '@/lib/auth';
import { KIDS_ROLES } from '@/lib/roles';

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth-only. RLS enforces data isolation to this church.
  await requireRole(KIDS_ROLES);
  return <>{children}</>;
}
