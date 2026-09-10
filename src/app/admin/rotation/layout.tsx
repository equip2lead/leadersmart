import { notFound, redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { ROTATION_DISABLED_NOTICE, canToggleRotation } from '@/lib/rotation';

// The gate for the admin rotation screens.
//
// This guard moved here from src/app/rotation/layout.tsx. That location was
// right when /rotation was going to hold the admin UI, and wrong the moment
// Phase 2 defined /rotation/[slug] as the *public* sign-up form: an auth check
// there would have turned the one page volunteers need into a login wall.
// /rotation is now public and self-guarding; everything requiring an account
// lives under /admin/rotation and is gated here.
//
// Three refusals, and they differ on purpose:
//
//   Ministry              → 404. The module is not theirs and never will be.
//   Church, opted out     → /settings with a notice. The page exists for them;
//                           the switch is one they own.
//   Not an admin          → /admin. Rotation administration is owner and
//                           admin_pastor only; a volunteer reads their own
//                           schedule at /me/[token] instead.
//
// The AppShell comes from the parent /admin layout, so this adds only the
// check — wrapping again would nest one shell inside another.
export default async function AdminRotationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, church } = await getMe();

  if (!canToggleRotation(church)) notFound();
  if (!church.rotation_enabled) {
    redirect(`/settings?notice=${ROTATION_DISABLED_NOTICE}`);
  }
  if (!canReviewAssignments(user.role)) redirect('/admin');

  return <>{children}</>;
}
