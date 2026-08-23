import { requireRole } from '@/lib/auth';
import { KIDS_ROLES } from '@/lib/roles';
import { AppShell } from '@/components/app-shell';

export default async function KidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await requireRole(KIDS_ROLES);
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
