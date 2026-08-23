import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { AppShell } from '@/components/app-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(ADMIN_ROLES);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
