import { requireRole } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function KidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole([
    'senior_pastor',
    'admin',
    'department_leader',
  ]);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
