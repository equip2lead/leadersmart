import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES, isOwner, roleLabelKey } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { roleDisplayName } from '@/lib/vocabulary';
import { PageHeading } from '@/components/page-heading';
import type { LeaderDevelopment } from '@/lib/types';
import {
  LeadersManager,
  type EligibleUser,
  type LeaderRow,
} from './_manager';

export const dynamic = 'force-dynamic';

export default async function LeadersPage() {
  const { user, church } = await requireRole(ADMIN_ROLES);

  const lang = user.preferred_language;
  const supabase = await createClient();

  const [pipelineRes, userRes] = await Promise.all([
    supabase
      .from('leader_development')
      .select('*')
      .eq('church_id', church.id)
      // Active first, then furthest along, so the people currently being
      // developed lead the list.
      .order('is_active', { ascending: false })
      .order('current_level', { ascending: false }),
    supabase
      .from('users')
      .select('id, full_name, role')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .order('full_name'),
  ]);

  const pipeline = (pipelineRes.data ?? []) as LeaderDevelopment[];
  const members = userRes.data ?? [];

  const nameById = new Map(members.map((m) => [m.id, m.full_name]));

  const leaders: LeaderRow[] = pipeline.map((p) => ({
    id: p.id,
    userId: p.user_id,
    // A tracked user who was since deactivated won't be in `members`;
    // fall back to the id so the row still renders rather than blanking.
    name: nameById.get(p.user_id) ?? p.user_id,
    level: p.current_level,
    startedAt: p.started_at,
    isActive: p.is_active,
    notes: p.notes,
  }));

  // Only offer people who aren't already tracked — the unique
  // (church_id, user_id) pair means offering them again could only
  // produce an error.
  const tracked = new Set(pipeline.map((p) => p.user_id));
  const eligible: EligibleUser[] = members
    .filter((m) => !tracked.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.full_name,
      roleLabel:
        roleDisplayName(m.role, church.organization_type, lang) ??
        t(roleLabelKey(m.role), lang),
    }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('leaders.page_title', lang)}
        subtitle={t('leaders.page_subtitle', lang)}
        actions={
          <Link href="/admin/leaders/levels" className="btn-secondary">
            {t('levels.definitions.page_title', lang)}
          </Link>
        }
      />
      <LeadersManager
        lang={lang}
        leaders={leaders}
        eligible={eligible}
        canDelete={isOwner(user.role)}
      />
    </div>
  );
}
