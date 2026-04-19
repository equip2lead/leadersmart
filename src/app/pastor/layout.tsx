import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function PastorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(['pastor']);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
