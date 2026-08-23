'use client';

import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

export type ActorOption = { id: string; name: string };

// Action + actor filters. Native GET form would work too but we want
// the dropdowns to submit-on-change without a visible submit button.
export function AuditFilters({
  currentAction,
  currentActor,
  actionOptions,
  actorOptions,
  lang,
}: {
  currentAction: string;
  currentActor: string;
  actionOptions: string[];
  actorOptions: ActorOption[];
  lang: AppLanguage;
}) {
  const router = useRouter();

  function update(patch: Record<string, string>) {
    const sp = new URLSearchParams();
    const nextAction = patch.action ?? currentAction;
    const nextActor = patch.actor ?? currentActor;
    if (nextAction) sp.set('action', nextAction);
    if (nextActor) sp.set('actor', nextActor);
    const qs = sp.toString();
    router.push(qs ? `/admin/audit-log?${qs}` : '/admin/audit-log');
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <div className="min-w-0 flex-1">
        <label className="label" htmlFor="audit-action">
          {t('audit.filter.action', lang)}
        </label>
        <select
          id="audit-action"
          className="input"
          value={currentAction}
          onChange={(e) => update({ action: e.target.value })}
        >
          <option value="">{t('audit.filter.allActions', lang)}</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {t(`audit.action.${a}`, lang)}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0 flex-1">
        <label className="label" htmlFor="audit-actor">
          {t('audit.filter.actor', lang)}
        </label>
        <select
          id="audit-actor"
          className="input"
          value={currentActor}
          onChange={(e) => update({ actor: e.target.value })}
        >
          <option value="">{t('audit.filter.allActors', lang)}</option>
          {actorOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {(currentAction || currentActor) && (
        <button
          type="button"
          onClick={() => router.push('/admin/audit-log')}
          className="btn-secondary"
        >
          {t('audit.filter.clear', lang)}
        </button>
      )}
    </div>
  );
}
