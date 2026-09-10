import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { ROTATION_DISABLED_NOTICE, canToggleRotation } from '@/lib/rotation';

// The gate for everything under /rotation.
//
// It lives in a layout rather than in each page on purpose: Phase 2 will add
// several routes here, and a guard that has to be remembered per page is a
// guard that eventually gets forgotten. Anything added below this file is
// gated by existing.
//
// The two refusals are deliberately different, because the two conditions
// mean different things:
//
//   Ministry            → 404. The module is not theirs and never will be, so
//                         the honest answer is that the page does not exist.
//                         A redirect to Settings would point at a toggle they
//                         cannot see.
//
//   Church, opted out   → redirect to /settings with a notice explaining why.
//                         The page does exist for them; it is switched off,
//                         and the switch is one they own.
//
// NOTE: as of this commit there are no pages under /rotation, so this layout
// never runs — Next has nothing to render beneath it and /rotation/* is a 404
// for everyone. The guard is in place for the Phase 2 routes that will sit
// here.
export default async function RotationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await getMe();

  if (!canToggleRotation(church)) notFound();
  if (!church.rotation_enabled) {
    redirect(`/settings?notice=${ROTATION_DISABLED_NOTICE}`);
  }

  return (
    <AppShell user={user} church={church}>
      {children}
    </AppShell>
  );
}
