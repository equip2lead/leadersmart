import { requireRole } from '@/lib/auth';
import { PASTOR_PAGE_ACCESS } from '@/lib/roles';
import { AppShell } from '@/components/app-shell';

export default async function PastorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(PASTOR_PAGE_ACCESS);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
