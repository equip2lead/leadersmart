import { getMe } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await getMe();
  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
