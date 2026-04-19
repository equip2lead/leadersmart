import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function LeaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(['department_leader']);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
