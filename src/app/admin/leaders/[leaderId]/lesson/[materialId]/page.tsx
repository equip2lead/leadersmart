import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { pickLang } from '@/lib/leaders';
import { resolveLessonAccess } from '@/lib/lesson-access';
import type { AssignmentResponse, ProgressStatus } from '@/lib/types';
import { LessonBody } from './_lesson-body';
import { AssignmentPanel } from './_assignment-panel';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<ProgressStatus, string> = {
  not_started: 'border-gray-200 bg-white text-muted',
  in_progress: 'border-gold-warm-200 bg-gold-warm-50 text-gold-warm-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ leaderId: string; materialId: string }>;
}) {
  const { leaderId, materialId } = await params;
  const { user } = await getMe();
  const lang = user.preferred_language;

  // Layer one of the guard. Layer two is RLS, which refuses the same rows
  // from underneath if this is ever bypassed. A refusal lands on /admin
  // rather than a 404 so the caller learns nothing about what exists.
  const access = await resolveLessonAccess(user, leaderId, materialId);
  if (!access) redirect('/admin');

  const { entry, material, level, isOwnEntry, canReview } = access;
  const supabase = await createClient();

  const [personRes, progressRes, responseRes] = await Promise.all([
    supabase.from('users').select('full_name').eq('id', entry.user_id).maybeSingle(),
    supabase
      .from('leader_progress')
      .select('status')
      .eq('leader_development_id', entry.id)
      .eq('requirement_type', 'material')
      .eq('requirement_id', material.id)
      .maybeSingle(),
    // Highest version is the live one; the rows below it are frozen history.
    supabase
      .from('assignment_responses')
      .select('*')
      .eq('leader_development_id', entry.id)
      .eq('material_id', material.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const personName = personRes.data?.full_name ?? entry.user_id;
  const status = (progressRes.data?.status ?? 'not_started') as ProgressStatus;
  const current = (responseRes.data as AssignmentResponse | null) ?? null;

  const title = pickLang(material.title, material.title_fr, lang) ?? material.title;
  const lessonText = pickLang(material.lesson_content, material.lesson_content_fr, lang);
  const prompt = pickLang(material.assignment_prompt, material.assignment_prompt_fr, lang);

  const leaderHref = `/admin/leaders/${entry.id}`;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-xs text-muted"
      >
        {/* The leaders index is admin-only. A leader reading their own lesson
            gets the same trail minus a link they would only be bounced from. */}
        {canReview && (
          <>
            <Link href="/admin/leaders" className="hover:text-ink">
              {t('lesson.breadcrumb_leaders', lang)}
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </>
        )}
        <Link href={leaderHref} className="hover:text-ink">
          {personName}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span>{t('lesson.level_badge', lang).replace('{level}', String(level))}</span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="font-medium text-body">{title}</span>
      </nav>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-manrope text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-royal-50 px-2.5 py-1 text-xs font-bold text-indigo-royal-700">
              {t('lesson.level_badge', lang).replace('{level}', String(level))}
            </span>
            <span
              className={
                'rounded-full border px-2.5 py-1 text-xs font-semibold ' +
                STATUS_PILL[status]
              }
            >
              {t(`leader_progress.status.${status}`, lang)}
            </span>
          </div>
        </div>
        <Link href={leaderHref} className="btn-secondary shrink-0">
          {t('lesson.back_to_leader', lang)}
        </Link>
      </div>

      {/* 60/40 on desktop, stacked below. The reading column comes first in
          source order, so the stacked phone layout puts the lesson above the
          assignment without a reordering trick. */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LessonBody content={lessonText} emptyLabel={t('lesson.no_content', lang)} />
        </div>
        <div className="lg:col-span-2">
          <AssignmentPanel
            lang={lang}
            leaderDevelopmentId={entry.id}
            materialId={material.id}
            prompt={prompt}
            initial={current}
            canWrite={isOwnEntry}
          />
        </div>
      </div>
    </div>
  );
}
