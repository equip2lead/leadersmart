import { getMe } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';

// The shell, not the gate.
//
// This layout used to call requireRole(ADMIN_ROLES), which made /admin/* an
// admins-only subtree wholesale. That stopped being right once a leader
// needed to open their own lesson at
// /admin/leaders/[leaderId]/lesson/[materialId] — a page that is theirs to
// read but sits under a path they may not otherwise enter.
//
// Removing the blanket check costs nothing, because it was never the only
// check: every page under /admin/ runs its own requireRole (or, for the
// lesson viewer, resolveLessonAccess), and each is scoped to what that page
// actually needs — OWNER_ROLES for the audit log, REVIEW_ROLES for
// submissions, ADMIN_ROLES for the rest. The layout guard was a second,
// coarser copy of a decision the pages were already making correctly.
//
// The rule that keeps this safe: a new page under /admin/ authorises itself.
// There is no longer an inherited guard to fall back on.
export default async function AdminLayout({
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
