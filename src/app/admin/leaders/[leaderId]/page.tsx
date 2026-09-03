import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { formatStartedDate, initialsOf, levelTone } from '@/lib/leaders';
import type {
  LeaderDevelopment,
  LeaderProgress,
  LevelCompetency,
  LevelDefinition,
  LevelMaterial,
  LevelMilestone,
} from '@/lib/types';
import { Checklist, type ChecklistItem } from './_checklist';
import { LevelJourney } from './_journey';

export const dynamic = 'force-dynamic';

export default async function LeaderDetailPage({
  params,
}: {
  params: Promise<{ leaderId: string }>;
}) {
  const { leaderId } = await params;
  const { user, church } = await requireRole(ADMIN_ROLES);
  const lang = user.preferred_language;
  const supabase = await createClient();

  // Scope to the caller's church before anything else: a valid uuid from
  // another tenant must 404 rather than leak a name.
  const { data: entryRow } = await supabase
    .from('leader_development')
    .select('*')
    .eq('id', leaderId)
    .eq('church_id', church.id)
    .maybeSingle();
  if (!entryRow) notFound();
  const entry = entryRow as LeaderDevelopment;

  const [personRes, defRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name')
      .eq('id', entry.user_id)
      .maybeSingle(),
    supabase
      .from('level_definitions')
      .select('*')
      .eq('church_id', church.id)
      .order('level'),
  ]);

  const personName = personRes.data?.full_name ?? entry.user_id;
  const definitions = (defRes.data ?? []) as LevelDefinition[];
  const definition =
    definitions.find((d) => d.level === entry.current_level) ?? null;

  // Requirements for the current level only. Without a definition there
  // is nothing to require, so the queries are skipped entirely.
  const defId = definition?.id ?? '';
  const [compRes, matRes, mileRes, progRes] = await Promise.all([
    supabase
      .from('level_competencies')
      .select('*')
      .eq('level_definition_id', defId)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('level_materials')
      .select('*')
      .eq('level_definition_id', defId)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('level_milestones')
      .select('*')
      .eq('level_definition_id', defId)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('leader_progress')
      .select('*')
      .eq('leader_development_id', entry.id),
  ]);

  // A requirement with no progress row has simply not been started —
  // rows are created lazily on first status change.
  const progressByKey = new Map(
    ((progRes.data ?? []) as LeaderProgress[]).map((p) => [
      `${p.requirement_type}:${p.requirement_id}`,
      p,
    ]),
  );
  const withProgress = (
    requirementType: ChecklistItem['requirementType'],
    requirementId: string,
  ) => {
    const p = progressByKey.get(`${requirementType}:${requirementId}`);
    return { status: p?.status ?? 'not_started', notes: p?.notes ?? null };
  };

  const items: ChecklistItem[] = [
    ...((compRes.data ?? []) as LevelCompetency[]).map((r) => ({
      requirementType: 'competency' as const,
      requirementId: r.id,
      label: r.name,
      description: r.description,
      ...withProgress('competency', r.id),
    })),
    ...((matRes.data ?? []) as LevelMaterial[]).map((r) => ({
      requirementType: 'material' as const,
      requirementId: r.id,
      label: r.title,
      description: r.description,
      materialType: r.material_type,
      url: r.url,
      ...withProgress('material', r.id),
    })),
    ...((mileRes.data ?? []) as LevelMilestone[]).map((r) => ({
      requirementType: 'milestone' as const,
      requirementId: r.id,
      label: r.name,
      description: r.description,
      ...withProgress('milestone', r.id),
    })),
  ];

  const total = items.length;
  const done = items.filter((i) => i.status === 'completed').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  // A level with no requirements defined yet is not "complete" — that
  // would mark every leader ready the moment they were added.
  const readyToAdvance = total > 0 && done === total;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <Link
        href="/admin/leaders"
        className="text-sm font-medium text-muted hover:text-ink"
      >
        {t('leader_progress.back_link', lang)}
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <span
          className={
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
            levelTone(entry.current_level)
          }
          aria-hidden="true"
        >
          {initialsOf(personName)}
        </span>
        <div className="min-w-0">
          <PageHeading
            title={personName}
            subtitle={t('leaders.card.started', lang).replace(
              '{date}',
              formatStartedDate(entry.started_at, lang),
            )}
          />
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('leader_progress.current_level', lang)}
        </p>
        <h2 className="mt-1 text-lg font-bold text-ink">
          {t('leader_progress.level_heading', lang)
            .replace('{level}', String(entry.current_level))
            .replace('{title}', definition?.title ?? '—')}
        </h2>
        {definition?.description && (
          <p className="mt-1 text-sm text-body">{definition.description}</p>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold text-body">
            {t('leader_progress.progress_label', lang)
              .replace('{done}', String(done))
              .replace('{total}', String(total))}
          </p>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-indigo-royal-700"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </section>

      <div className="mt-6">
        <LevelJourney
          lang={lang}
          definitions={definitions}
          currentLevel={entry.current_level}
          readyToAdvance={readyToAdvance}
        />
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-ink">
          {t('leader_progress.requirements_title', lang)}
        </h2>
        <div className="mt-4">
          {total === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
              <p className="text-sm text-body">
                {t('leader_progress.empty', lang)}
              </p>
              <Link href="/admin/leaders/levels" className="btn-primary mt-4">
                {t('leader_progress.empty_cta', lang)}
              </Link>
            </div>
          ) : (
            <Checklist
              lang={lang}
              leaderDevelopmentId={entry.id}
              items={items}
              readOnly={false}
            />
          )}
        </div>
      </section>

    </div>
  );
}
