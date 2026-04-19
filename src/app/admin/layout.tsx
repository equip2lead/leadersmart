import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(['senior_pastor', 'admin']);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
