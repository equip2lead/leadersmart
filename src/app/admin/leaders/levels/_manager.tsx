'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { t } from '@/lib/i18n';
import { levelTone } from '@/lib/leaders';
import type { AppLanguage, LevelDefinition } from '@/lib/types';
import { updateLevelDefinition } from './actions';
import { RequirementSection, type RequirementRow } from './_requirements';

function mapError(code: string, lang: AppLanguage): string {
  const key = `levels.definitions.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

type RowsByDefinition = Record<string, RequirementRow[]>;

export function LevelsManager({
  lang,
  definitions,
  competencies,
  materials,
  milestones,
}: {
  lang: AppLanguage;
  definitions: LevelDefinition[];
  competencies: RowsByDefinition;
  materials: RowsByDefinition;
  milestones: RowsByDefinition;
}) {
  const router = useRouter();
  const [activeLevel, setActiveLevel] = useState(definitions[0]?.level ?? 1);

  // Edits are held per level so switching tabs doesn't discard a draft
  // the admin hasn't saved yet.
  const [drafts, setDrafts] = useState<
    Record<string, { title: string; description: string }>
  >(() =>
    Object.fromEntries(
      definitions.map((d) => [
        d.id,
        { title: d.title, description: d.description ?? '' },
      ]),
    ),
  );
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = definitions.find((d) => d.level === activeLevel);
  const draft = active ? drafts[active.id] : null;

  const isDirty =
    !!active &&
    !!draft &&
    (draft.title !== active.title ||
      draft.description !== (active.description ?? ''));

  function save() {
    if (!active || !draft) return;
    setError(null);
    setSavedId(null);
    startTransition(async () => {
      const res = await updateLevelDefinition({
        id: active.id,
        title: draft.title,
        description: draft.description,
      });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setSavedId(active.id);
      router.refresh();
    });
  }

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label={t('levels.definitions.page_title', lang)}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {definitions.map((d) => {
          const isActive = d.level === activeLevel;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setError(null);
                setSavedId(null);
                setActiveLevel(d.level);
              }}
              className={
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ' +
                (isActive
                  ? 'bg-indigo-royal-700 text-white'
                  : 'bg-white text-body hover:bg-gray-50')
              }
            >
              <span
                className={
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ' +
                  (isActive ? 'bg-white/20 text-white' : levelTone(d.level))
                }
                aria-hidden="true"
              >
                {d.level}
              </span>
              <span className="max-w-[10rem] truncate">{d.title}</span>
            </button>
          );
        })}
      </div>

      {active && draft && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('levels.definitions.level_tab', lang).replace(
              '{level}',
              String(active.level),
            )}
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="level-title">
                {t('levels.definitions.title_label', lang)}
              </label>
              <input
                id="level-title"
                className="input"
                maxLength={80}
                value={draft.title}
                placeholder={t('levels.definitions.title_placeholder', lang)}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [active.id]: { ...draft, title: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className="label" htmlFor="level-description">
                {t('levels.definitions.description_label', lang)}
              </label>
              <textarea
                id="level-description"
                className="input"
                rows={3}
                maxLength={500}
                value={draft.description}
                placeholder={t(
                  'levels.definitions.description_placeholder',
                  lang,
                )}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [active.id]: { ...draft, description: e.target.value },
                  }))
                }
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            {isDirty ? (
              <span className="text-xs text-muted">
                {t('levels.definitions.unsaved', lang)}
              </span>
            ) : savedId === active.id ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {t('levels.definitions.saved', lang)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={save}
              disabled={pending || !isDirty || !draft.title.trim()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? t('common.loading', lang)
                : t('levels.definitions.save', lang)}
            </button>
          </div>
        </div>
      )}

      {active && (
        <div className="mt-6 space-y-4">
          <RequirementSection
            lang={lang}
            type="competency"
            levelDefinitionId={active.id}
            rows={competencies[active.id] ?? []}
          />
          <RequirementSection
            lang={lang}
            type="material"
            levelDefinitionId={active.id}
            rows={materials[active.id] ?? []}
          />
          <RequirementSection
            lang={lang}
            type="milestone"
            levelDefinitionId={active.id}
            rows={milestones[active.id] ?? []}
          />
        </div>
      )}
    </div>
  );
}
