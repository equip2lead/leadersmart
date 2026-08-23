import { requireRole } from '@/lib/auth';
import { LEADER_ROLES } from '@/lib/roles';
import { AppShell } from '@/components/app-shell';

export default async function LeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(LEADER_ROLES);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
