'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, UserX, RotateCcw } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, UserRole } from '@/lib/types';
import {
  changeUserRole,
  removeUserFromChurch,
  reactivateUser,
} from './actions';
import { ConfirmDialog } from './_confirm-dialog';

export type UserRowData = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
};

type PendingAction = null | 'promote' | 'demote' | 'remove' | 'reactivate';

// Admin Pastor pool used to compute the soft-limit warning: new role
// admin_pastor plus the legacy 'pastor' role for pre-migration accounts.
const ADMIN_PASTOR_ROLES: readonly UserRole[] = ['admin_pastor', 'pastor'];
const DEPARTMENT_HEAD_ROLES: readonly UserRole[] = ['department_head', 'department_leader'];
const ADMIN_PASTOR_SOFT_LIMIT = 10;

export function UserRow({
  user,
  meId,
  callerIsOwner,
  currentAdminPastorCount,
  lang,
}: {
  user: UserRowData;
  meId: string;
  callerIsOwner: boolean;
  currentAdminPastorCount: number;
  lang: AppLanguage;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isMe = user.id === meId;
  const isOwner = user.role === 'owner';
  const isAdminPastor = (ADMIN_PASTOR_ROLES as readonly string[]).includes(user.role);
  const isDeptHead = (DEPARTMENT_HEAD_ROLES as readonly string[]).includes(user.role);

  // Only Owner can act, and never on themselves or on the church owner.
  const canAct = callerIsOwner && !isMe && !isOwner;
  const canPromote = canAct && isDeptHead;
  const canDemote = canAct && isAdminPastor;
  const canRemove = canAct && user.is_active;
  const canReactivate = canAct && !user.is_active;

  // Would this promotion tip us over the soft limit?
  const wouldExceedSoftLimit =
    action === 'promote' &&
    currentAdminPastorCount + 1 >= ADMIN_PASTOR_SOFT_LIMIT;

  function runAction(kind: Exclude<PendingAction, null>) {
    setError(null);
    startTransition(async () => {
      let res;
      if (kind === 'promote') res = await changeUserRole(user.id, 'admin_pastor');
      else if (kind === 'demote') res = await changeUserRole(user.id, 'department_head');
      else if (kind === 'remove') res = await removeUserFromChurch(user.id);
      else res = await reactivateUser(user.id);

      if (!res.ok) {
        setError(mapError(res.error, lang));
        return;
      }
      setAction(null);
      router.refresh();
    });
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US');
  };

  return (
    <>
      <tr
        className={`transition ${expanded ? 'bg-brand-50/40' : 'hover:bg-gray-50'} cursor-pointer`}
        onClick={() => setExpanded((s) => !s)}
      >
        <td className="px-4 py-3 text-sm font-medium text-ink">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
            )}
            <span>{user.full_name}</span>
            {isOwner && (
              <span
                className="ml-1 inline-flex items-center rounded-full bg-flame-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-flame-700"
                title={t('nav.owner.badgeTitle', lang)}
              >
                {t('nav.owner.badge', lang)}
              </span>
            )}
            {isMe && (
              <span className="ml-1 text-xs text-muted">({t('users.you', lang)})</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-body">{user.email}</td>
        <td className="px-4 py-3 text-sm text-body">{t(`role.${user.role}`, lang)}</td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              user.is_active
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {user.is_active
              ? t('users.status.active', lang)
              : t('users.status.inactive', lang)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted">
          {formatDate(user.last_login_at)}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-brand-50/20">
          <td colSpan={5} className="px-4 py-4">
            <div className="rounded-xl border border-brand-100 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('userDetail.primaryRole', lang)}
                  </p>
                  <p className="mt-1 text-sm text-ink">{t(`role.${user.role}`, lang)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('userDetail.lastLogin', lang)}
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    {formatDate(user.last_login_at)}
                  </p>
                </div>
              </div>

              {!callerIsOwner ? (
                <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-muted">
                  {t('userDetail.ownerOnlyActions', lang)}
                </p>
              ) : isMe || isOwner ? (
                <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-muted">
                  {isOwner
                    ? t('userDetail.ownerLocked', lang)
                    : t('userDetail.selfLocked', lang)}
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {canPromote && (
                    <button
                      type="button"
                      onClick={() => setAction('promote')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                    >
                      <ArrowUp className="h-3 w-3" />
                      {t('userDetail.action.promote', lang)}
                    </button>
                  )}
                  {canDemote && (
                    <button
                      type="button"
                      onClick={() => setAction('demote')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-gray-50"
                    >
                      <ArrowDown className="h-3 w-3" />
                      {t('userDetail.action.demote', lang)}
                    </button>
                  )}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => setAction('remove')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <UserX className="h-3 w-3" />
                      {t('userDetail.action.remove', lang)}
                    </button>
                  )}
                  {canReactivate && (
                    <button
                      type="button"
                      onClick={() => setAction('reactivate')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t('userDetail.action.reactivate', lang)}
                    </button>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      <ConfirmDialog
        open={action === 'promote'}
        title={t('userDetail.confirm.promote.title', lang).replace('{name}', user.full_name)}
        body={
          wouldExceedSoftLimit
            ? `${t('userDetail.confirm.promote.body', lang)}\n\n${t('users.softLimit.title', lang).replace('{count}', String(currentAdminPastorCount + 1))} ${t('users.softLimit.body', lang)}`
            : t('userDetail.confirm.promote.body', lang)
        }
        confirmLabel={t('userDetail.confirm.promote.confirm', lang)}
        cancelLabel={t('common.cancel', lang)}
        onConfirm={() => runAction('promote')}
        onCancel={() => {
          setAction(null);
          setError(null);
        }}
        pending={pending}
        error={error}
      />

      <ConfirmDialog
        open={action === 'demote'}
        title={t('userDetail.confirm.demote.title', lang).replace('{name}', user.full_name)}
        body={t('userDetail.confirm.demote.body', lang)}
        confirmLabel={t('userDetail.confirm.demote.confirm', lang)}
        cancelLabel={t('common.cancel', lang)}
        onConfirm={() => runAction('demote')}
        onCancel={() => {
          setAction(null);
          setError(null);
        }}
        pending={pending}
        error={error}
      />

      <ConfirmDialog
        open={action === 'remove'}
        destructive
        title={t('userDetail.confirm.remove.title', lang).replace('{name}', user.full_name)}
        body={t('userDetail.confirm.remove.body', lang).replace('{name}', user.full_name)}
        confirmLabel={t('userDetail.confirm.remove.confirm', lang)}
        cancelLabel={t('common.cancel', lang)}
        onConfirm={() => runAction('remove')}
        onCancel={() => {
          setAction(null);
          setError(null);
        }}
        pending={pending}
        error={error}
      />

      <ConfirmDialog
        open={action === 'reactivate'}
        title={t('userDetail.confirm.reactivate.title', lang).replace('{name}', user.full_name)}
        body={t('userDetail.confirm.reactivate.body', lang)}
        confirmLabel={t('userDetail.confirm.reactivate.confirm', lang)}
        cancelLabel={t('common.cancel', lang)}
        onConfirm={() => runAction('reactivate')}
        onCancel={() => {
          setAction(null);
          setError(null);
        }}
        pending={pending}
        error={error}
      />
    </>
  );
}

function mapError(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'not_found':
      return t('userDetail.error.notFound', lang);
    case 'cannot_change_own_role':
      return t('userDetail.error.selfRole', lang);
    case 'cannot_remove_self':
      return t('userDetail.error.selfRemove', lang);
    case 'cannot_change_owner':
    case 'cannot_remove_owner':
      return t('userDetail.error.ownerLocked', lang);
    case 'invalid_transition':
      return t('userDetail.error.invalidTransition', lang);
    default:
      return code;
  }
}
