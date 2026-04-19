import { requireRole } from '@/lib/auth';

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth-only. RLS enforces data isolation to this church.
  await requireRole(['senior_pastor', 'admin', 'department_leader']);
  return <>{children}</>;
}
