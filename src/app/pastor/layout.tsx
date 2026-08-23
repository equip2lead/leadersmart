import { requireRole } from '@/lib/auth';
import { PASTOR_ROLES } from '@/lib/roles';
import { AppShell } from '@/components/app-shell';

export default async function PastorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(PASTOR_ROLES);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
