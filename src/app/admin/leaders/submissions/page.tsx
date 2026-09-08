import { requireRole } from '@/lib/auth';
import { REVIEW_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { pickLang } from '@/lib/leaders';
import { PageHeading } from '@/components/page-heading';
import type {
  AssignmentResponse,
  LeaderDevelopment,
  LevelDefinition,
  LevelMaterial,
} from '@/lib/types';
import { SubmissionsBoard, type SubmissionRow, type TabKey } from './_board';

export const dynamic = 'force-dynamic';

const TABS: TabKey[] = ['pending', 'reviewed', 'all'];

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  // REVIEW_ROLES, not ADMIN_ROLES: the RLS helper behind these rows is
  // has_admin_rights() = owner + admin_pastor. A legacy 'admin' waved through
  // here would just be handed an empty table by the database.
  const { user, church } = await requireRole(REVIEW_ROLES);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const tab: TabKey = TABS.includes(params.tab as TabKey)
    ? (params.tab as TabKey)
    : 'pending';

  // Only rows a leader has actually sent. Drafts are private working copies —
  // a mentor reading one would be reading over the leader's shoulder.
  let query = supabase
    .from('assignment_responses')
    .select('*')
    .in('status', ['submitted', 'reviewed']);
  if (tab === 'pending') query = query.eq('status', 'submitted');
  if (tab === 'reviewed') query = query.eq('status', 'reviewed');

  const { data: responseData } = await query
    .order('submitted_at', { ascending: false })
    .limit(200);
  const responses = (responseData ?? []) as AssignmentResponse[];

  // Pending count for the tab label is independent of the current filter, so
  // it survives switching to "Reviewed" and back.
  const { count: pendingCount } = await supabase
    .from('assignment_responses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'submitted');

  // Hydrate the three lookups the rows need. RLS already scopes
  // assignment_responses to this church, so these are joins, not filters —
  // except leader_development, which is re-scoped as the app-side half of the
  // tenant guard.
  const leaderIds = [...new Set(responses.map((r) => r.leader_development_id))];
  const materialIds = [...new Set(responses.map((r) => r.material_id))];

  const [entryRes, matRes, defRes] = await Promise.all([
    leaderIds.length
      ? supabase
          .from('leader_development')
          .select('*')
          .in('id', leaderIds)
          .eq('church_id', church.id)
      : Promise.resolve({ data: [] as LeaderDevelopment[] }),
    materialIds.length
      ? supabase.from('level_materials').select('*').in('id', materialIds)
      : Promise.resolve({ data: [] as LevelMaterial[] }),
    supabase.from('level_definitions').select('*').eq('church_id', church.id),
  ]);

  const entries = (entryRes.data ?? []) as LeaderDevelopment[];
  const materials = (matRes.data ?? []) as LevelMaterial[];
  const definitions = (defRes.data ?? []) as LevelDefinition[];

  const entryById = new Map(entries.map((e) => [e.id, e]));
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const levelByDefId = new Map(definitions.map((d) => [d.id, d.level]));

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('church_id', church.id);
  const nameById = new Map(
    (userData ?? []).map((u) => [u.id as string, u.full_name as string]),
  );

  const rows: SubmissionRow[] = responses.flatMap((r) => {
    const entry = entryById.get(r.leader_development_id);
    const material = materialById.get(r.material_id);
    // A row whose leader or material did not come back is one this church
    // cannot see. Dropping it is the correct outcome, not an error.
    if (!entry || !material) return [];

    return [
      {
        id: r.id,
        leaderDevelopmentId: entry.id,
        materialId: material.id,
        leaderName: nameById.get(entry.user_id) ?? entry.user_id,
        level: levelByDefId.get(material.level_definition_id) ?? entry.current_level,
        materialTitle:
          pickLang(material.title, material.title_fr, lang) ?? material.title,
        status: r.status,
        version: r.version,
        submittedAt: r.submitted_at,
        reviewedAt: r.reviewed_at,
        reviewerName: r.reviewed_by ? (nameById.get(r.reviewed_by) ?? null) : null,
        reviewerComment: r.reviewer_comment,
        responseText: r.response_text,
      },
    ];
  });

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('submissions.page_title', lang)}
        subtitle={t('submissions.page_subtitle', lang)}
      />
      <div className="mt-6">
        <SubmissionsBoard
          lang={lang}
          tab={tab}
          rows={rows}
          pendingCount={pendingCount ?? 0}
        />
      </div>
    </div>
  );
}
