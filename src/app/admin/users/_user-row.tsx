'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  UserX,
  RotateCcw,
  Baby,
} from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, UserRole } from '@/lib/types';
import {
  changeUserRole,
  removeUserFromChurch,
  reactivateUser,
  grantFireKidsCoordinator,
  revokeFireKidsCoordinator,
} from './actions';
import { ConfirmDialog } from './_confirm-dialog';

export type UserRowData = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  secondary_roles: UserRole[];
};

type PendingAction =
  | null
  | 'promote'
  | 'demote'
  | 'remove'
  | 'reactivate'
  | 'grantFireKids'
  | 'revokeFireKids';

const ADMIN_PASTOR_ROLES: readonly UserRole[] = ['admin_pastor', 'pastor'];
const DEPARTMENT_HEAD_ROLES: readonly UserRole[] = ['department_head', 'department_leader'];
const ADMIN_PASTOR_SOFT_LIMIT = 10;

// Colour map for role badges. Owner (flame), Fire Kids (indigo), rest
// grey. Kept tiny so it inlines rather than pulling a Tailwind config.
function badgeClass(role: UserRole): string {
  if (role === 'owner') return 'bg-gold-warm-100 text-gold-warm-700';
  if (role === 'fire_kids_coordinator') return 'bg-indigo-100 text-indigo-700';
  if (role === 'admin_pastor' || role === 'pastor')
    return 'bg-indigo-royal-100 text-indigo-royal-700';
  return 'bg-gray-100 text-gray-700';
}

function RoleBadge({ role, lang }: { role: UserRole; lang: AppLanguage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(role)}`}
    >
      {t(`role.${role}`, lang)}
    </span>
  );
}

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
  const hasFireKids = user.secondary_roles.includes('fire_kids_coordinator');

  const canAct = callerIsOwner && !isMe && !isOwner;
  const canPromote = canAct && isDeptHead;
  const canDemote = canAct && isAdminPastor;
  const canRemove = canAct && user.is_active;
  const canReactivate = canAct && !user.is_active;
  // Fire Kids is owner-granted regardless of primary role. Don't offer
  // it for inactive accounts — reactivate first.
  const canGrantFireKids = callerIsOwner && !isMe && user.is_active && !hasFireKids;
  const canRevokeFireKids = callerIsOwner && !isMe && hasFireKids;

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
      else if (kind === 'reactivate') res = await reactivateUser(user.id);
      else if (kind === 'grantFireKids') res = await grantFireKidsCoordinator(user.id);
      else res = await revokeFireKidsCoordinator(user.id);

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
        className={`transition ${expanded ? 'bg-indigo-royal-50/40' : 'hover:bg-gray-50'} cursor-pointer`}
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
                className="ml-1 inline-flex items-center rounded-full bg-gold-warm-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-warm-700"
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
        <td className="px-4 py-3 text-sm text-body">
          <div className="flex flex-wrap items-center gap-1">
            <RoleBadge role={user.role} lang={lang} />
            {user.secondary_roles.map((r) => (
              <RoleBadge key={r} role={r} lang={lang} />
            ))}
          </div>
        </td>
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
        <tr className="bg-indigo-royal-50/20">
          <td colSpan={5} className="px-4 py-4">
            <div className="rounded-xl border border-indigo-royal-100 bg-white p-4">
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
                {user.secondary_roles.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t('userDetail.secondaryRoles', lang)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.secondary_roles.map((r) => (
                        <RoleBadge key={r} role={r} lang={lang} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {!callerIsOwner ? (
                <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-muted">
                  {t('userDetail.ownerOnlyActions', lang)}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {(isMe || isOwner) && (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-muted">
                      {isOwner
                        ? t('userDetail.ownerLocked', lang)
                        : t('userDetail.selfLocked', lang)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {canPromote && (
                      <button
                        type="button"
                        onClick={() => setAction('promote')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-royal-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-royal-700 transition hover:bg-indigo-royal-50"
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
                    {canGrantFireKids && (
                      <button
                        type="button"
                        onClick={() => setAction('grantFireKids')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        <Baby className="h-3 w-3" />
                        {t('userDetail.action.grantFireKids', lang)}
                      </button>
                    )}
                    {canRevokeFireKids && (
                      <button
                        type="button"
                        onClick={() => setAction('revokeFireKids')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-gray-50"
                      >
                        <Baby className="h-3 w-3" />
                        {t('userDetail.action.revokeFireKids', lang)}
                      </button>
                    )}
                  </div>
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

      <ConfirmDialog
        open={action === 'grantFireKids'}
        title={t('userDetail.confirm.grantFireKids.title', lang).replace('{name}', user.full_name)}
        body={t('userDetail.confirm.grantFireKids.body', lang)}
        confirmLabel={t('userDetail.confirm.grantFireKids.confirm', lang)}
        cancelLabel={t('common.cancel', lang)}
        onConfirm={() => runAction('grantFireKids')}
        onCancel={() => {
          setAction(null);
          setError(null);
        }}
        pending={pending}
        error={error}
      />

      <ConfirmDialog
        open={action === 'revokeFireKids'}
        destructive
        title={t('userDetail.confirm.revokeFireKids.title', lang).replace('{name}', user.full_name)}
        body={t('userDetail.confirm.revokeFireKids.body', lang).replace('{name}', user.full_name)}
        confirmLabel={t('userDetail.confirm.revokeFireKids.confirm', lang)}
        cancelLabel={t('common.cancel', lang)}
        onConfirm={() => runAction('revokeFireKids')}
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
