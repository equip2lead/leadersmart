import { Sidebar } from './sidebar';
import { LanguageToggle } from './language-toggle';
import { Wordmark } from './wordmark';
import { canReviewAssignments } from '@/lib/roles';
import { canUseRotation } from '@/lib/rotation';
import { createClient } from '@/lib/supabase/server';
import type { Church, User } from '@/lib/types';

/**
 * Assignment responses waiting on a mentor, for the sidebar badge.
 *
 * A head-only count, so the rows never leave the database, and scoped by RLS
 * rather than an explicit church filter — assignment_responses has no
 * church_id of its own, and the SELECT policy already resolves the tenant
 * through leader_development. Non-reviewers skip the query entirely: they
 * have no badge to draw, and the policy would hand them 0 regardless.
 *
 * Returns 0 on any failure. A badge is an ornament on the navigation; it must
 * never be the reason a page fails to render.
 */
async function countPendingReviews(user: User): Promise<number> {
  if (!canReviewAssignments(user.role)) return 0;
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from('assignment_responses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted');
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function AppShell({
  user,
  church,
  children,
}: {
  user: User;
  church: Church;
  children: React.ReactNode;
}) {
  const pendingReviews = await countPendingReviews(user);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role={user.role}
        userName={user.full_name}
        churchName={church.name}
        lang={user.preferred_language}
        orgType={church.organization_type}
        pendingReviews={pendingReviews}
        rotationEnabled={canUseRotation(church)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
          {/* Mirrors the sidebar's brand block, which is hidden below md. */}
          <span className="md:hidden">
            <Wordmark size="xs" />
          </span>
          <div className="ml-auto">
            <LanguageToggle current={user.preferred_language} />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
