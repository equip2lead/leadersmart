'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, StickyNote } from 'lucide-react';
import { t } from '@/lib/i18n';
import { PROGRESS_STATUSES } from '@/lib/types';
import type {
  AppLanguage,
  MaterialType,
  ProgressStatus,
  RequirementType,
} from '@/lib/types';
import { setProgressNotes, setProgressStatus } from './actions';

export type ChecklistItem = {
  requirementType: RequirementType;
  requirementId: string;
  label: string;
  description: string | null;
  status: ProgressStatus;
  notes: string | null;
  materialType?: MaterialType;
  url?: string | null;
};

function mapError(code: string, lang: AppLanguage): string {
  const key = `leader_progress.err.${code}`;
  const translated = t(key, lang);
  return translated === key ? code : translated;
}

const STATUS_CLASS: Record<ProgressStatus, string> = {
  not_started: 'bg-white text-body border-gray-200',
  in_progress: 'bg-gold-warm-50 text-gold-warm-700 border-gold-warm-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function Checklist({
  lang,
  leaderDevelopmentId,
  items,
  readOnly,
}: {
  lang: AppLanguage;
  leaderDevelopmentId: string;
  items: ChecklistItem[];
  /** Non-admins can see the pipeline but not change it. */
  readOnly: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [pending, startTransition] = useTransition();

  const sections: RequirementType[] = ['competency', 'material', 'milestone'];

  function changeStatus(item: ChecklistItem, status: ProgressStatus) {
    if (readOnly) return;
    setError(null);
    startTransition(async () => {
      const res = await setProgressStatus({
        leaderDevelopmentId,
        requirementType: item.requirementType,
        requirementId: item.requirementId,
        status,
      });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      router.refresh();
    });
  }

  function saveNote(item: ChecklistItem) {
    setError(null);
    startTransition(async () => {
      const res = await setProgressNotes({
        leaderDevelopmentId,
        requirementType: item.requirementType,
        requirementId: item.requirementId,
        notes: noteDraft,
      });
      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setNoteFor(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {sections.map((section) => {
        const rows = items.filter((i) => i.requirementType === section);
        if (rows.length === 0) return null;
        return (
          <section key={section}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
              {t(`leader_progress.section.${section}`, lang)}
            </h3>
            <ul className="mt-2 space-y-2">
              {rows.map((item) => {
                const key = `${item.requirementType}:${item.requirementId}`;
                return (
                  <li
                    key={key}
                    className="rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                          {item.label}
                          {item.materialType && (
                            <span className="rounded-full bg-indigo-royal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-royal-700">
                              {t(
                                `levels.materials.type.${item.materialType}`,
                                lang,
                              )}
                            </span>
                          )}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-body">
                            {item.description}
                          </p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-royal-700 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            {item.url}
                          </a>
                        )}
                      </div>

                      {readOnly ? (
                        <span
                          className={
                            'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ' +
                            STATUS_CLASS[item.status]
                          }
                        >
                          {t(`leader_progress.status.${item.status}`, lang)}
                        </span>
                      ) : (
                        <div
                          role="group"
                          aria-label={item.label}
                          className="flex shrink-0 flex-wrap gap-1"
                        >
                          {PROGRESS_STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              disabled={pending}
                              aria-pressed={item.status === s}
                              onClick={() => changeStatus(item, s)}
                              className={
                                'rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ' +
                                (item.status === s
                                  ? STATUS_CLASS[s]
                                  : 'border-gray-200 bg-white text-muted hover:text-ink')
                              }
                            >
                              {t(`leader_progress.status.${s}`, lang)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {item.notes && noteFor !== key && (
                      <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-body">
                        {item.notes}
                      </p>
                    )}

                    {!readOnly &&
                      (noteFor === key ? (
                        <div className="mt-3">
                          <label className="label" htmlFor={`note-${key}`}>
                            {t('leader_progress.notes_label', lang)}
                          </label>
                          <textarea
                            id={`note-${key}`}
                            className="input"
                            rows={2}
                            maxLength={500}
                            value={noteDraft}
                            placeholder={t(
                              'leader_progress.notes_placeholder',
                              lang,
                            )}
                            onChange={(e) => setNoteDraft(e.target.value)}
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setNoteFor(null)}
                              disabled={pending}
                              className="text-sm font-medium text-muted hover:text-ink"
                            >
                              {t('levels.req.cancel', lang)}
                            </button>
                            <button
                              type="button"
                              onClick={() => saveNote(item)}
                              disabled={pending}
                              className="btn-primary"
                            >
                              {pending
                                ? t('common.loading', lang)
                                : t('leader_progress.notes_save', lang)}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteFor(key);
                            setNoteDraft(item.notes ?? '');
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
                        >
                          <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('leader_progress.notes_edit', lang)}
                        </button>
                      ))}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
