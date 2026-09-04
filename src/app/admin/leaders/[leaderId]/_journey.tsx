import { Check, Lock, Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n';
import { levelTone, pickLang } from '@/lib/leaders';
import { MAX_LEADER_LEVEL } from '@/lib/types';
import type { AppLanguage, LevelDefinition } from '@/lib/types';

// All five levels at a glance: what's behind them, where they are, and
// what's still locked. Levels are strictly ordered, so "completed" is
// simply anything below the current one — there is no per-level history
// table, and inventing one to answer this would be over-building.
export function LevelJourney({
  lang,
  definitions,
  currentLevel,
  readyToAdvance,
}: {
  lang: AppLanguage;
  definitions: LevelDefinition[];
  currentLevel: number;
  readyToAdvance: boolean;
}) {
  const atTop = currentLevel >= MAX_LEADER_LEVEL;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          {t('leader_journey.title', lang)}
        </h2>
        {readyToAdvance && !atTop && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t('leader_journey.ready_badge', lang).replace(
              '{level}',
              String(currentLevel + 1),
            )}
          </span>
        )}
      </div>

      {readyToAdvance && !atTop && (
        <p className="mt-2 text-sm text-body">
          {t('leader_journey.ready_hint', lang)}
        </p>
      )}
      {readyToAdvance && atTop && (
        <p className="mt-2 text-sm text-body">
          {t('leader_journey.at_top', lang)}
        </p>
      )}

      <ol className="mt-5 space-y-2">
        {definitions.map((d) => {
          const title = pickLang(d.title, d.title_fr, lang) ?? d.title;
          const description = pickLang(d.description, d.description_fr, lang);
          const state =
            d.level < currentLevel
              ? 'completed'
              : d.level === currentLevel
                ? 'current'
                : 'locked';
          return (
            <li
              key={d.id}
              className={
                'flex items-center gap-3 rounded-lg border px-4 py-3 ' +
                (state === 'current'
                  ? 'border-indigo-royal-300 bg-indigo-royal-50/50'
                  : 'border-gray-100 bg-white')
              }
            >
              <span
                className={
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
                  (state === 'locked'
                    ? 'bg-gray-100 text-gray-400'
                    : levelTone(d.level))
                }
                aria-hidden="true"
              >
                {state === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : state === 'locked' ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  d.level
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={
                    'truncate text-sm font-semibold ' +
                    (state === 'locked' ? 'text-muted' : 'text-ink')
                  }
                >
                  {title}
                </p>
                {description && (
                  <p className="truncate text-xs text-muted">{description}</p>
                )}
              </div>

              <span
                className={
                  'shrink-0 text-[10px] font-bold uppercase tracking-wide ' +
                  (state === 'completed'
                    ? 'text-emerald-700'
                    : state === 'current'
                      ? 'text-indigo-royal-700'
                      : 'text-gray-400')
                }
              >
                {t(`leader_journey.state.${state}`, lang)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
