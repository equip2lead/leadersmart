'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { roleDisplayName } from '@/lib/vocabulary';
import type { AppLanguage, OrganizationType } from '@/lib/types';
import { inviteUser } from './actions';

type InvitableRole =
  | 'admin_pastor'
  | 'department_head'
  | 'fire_kids_coordinator';

export function InviteUserForm({
  lang,
  serviceKeyAvailable,
  callerIsOwner,
  orgType,
}: {
  lang: AppLanguage;
  serviceKeyAvailable: boolean;
  callerIsOwner: boolean;
  orgType: OrganizationType;
}) {
  const router = useRouter();

  // Options depend on caller role: admin_pastor and fire_kids_coordinator
  // are owner-only grants per Section 17 decisions #3 and #5. Non-owner
  // admins only see department_head.
  //
  // Fire Kids is a Fire-Church-specific programme with no ministry
  // meaning, so it is dropped for ministries rather than relabelled.
  // Labels go through roleDisplayName, which returns the church
  // vocabulary — identical to the role.* strings used before — for
  // churches, and Admin Leader / Team Leader for ministries.
  const options = useMemo<Array<{ value: InvitableRole; label: string }>>(() => {
    const label = (r: InvitableRole) =>
      roleDisplayName(r, orgType, lang) ?? t(`role.${r}`, lang);
    const values: InvitableRole[] = callerIsOwner
      ? orgType === 'ministry'
        ? ['admin_pastor', 'department_head']
        : ['admin_pastor', 'department_head', 'fire_kids_coordinator']
      : ['department_head'];
    return values.map((value) => ({ value, label: label(value) }));
  }, [callerIsOwner, orgType, lang]);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<InvitableRole>(options[0].value);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const fd = new FormData();
    fd.set('email', email);
    fd.set('full_name', fullName);
    fd.set('role', role);

    startTransition(async () => {
      const res = await inviteUser(fd);
      if (!res.ok) {
        setError(errorMessage(res.error, lang));
        return;
      }
      setNotice(t('invite.sentTo', lang).replace('{email}', res.email));
      setEmail('');
      setFullName('');
      setRole(options[0].value);
      router.refresh();
    });
  }

  if (!serviceKeyAvailable) {
    return (
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">{t('invite.disabled.title', lang)}</p>
        <p className="mt-1 text-xs">{t('invite.disabled.body', lang)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor="invite-name">
          {t('invite.form.name', lang)}
        </label>
        <input
          id="invite-name"
          className="input"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="invite-email">
          {t('invite.form.email', lang)}
        </label>
        <input
          id="invite-email"
          className="input"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="invite-role">
          {t('invite.form.role', lang)}
        </label>
        <select
          id="invite-role"
          className="input"
          value={role}
          onChange={(e) => setRole(e.target.value as InvitableRole)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {!callerIsOwner && (
          <p className="mt-1 text-xs text-muted">{t('invite.form.nonOwnerHint', lang)}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t('common.loading', lang) : t('invite.submit', lang)}
      </button>
    </form>
  );
}

function errorMessage(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'missing_service_key':
      return t('invite.error.missingKey', lang);
    case 'invalid_email':
      return t('invite.error.invalidEmail', lang);
    case 'name_required':
      return t('invite.error.nameRequired', lang);
    case 'invalid_role':
      return t('invite.error.invalidRole', lang);
    case 'owner_only_role':
      return t('invite.error.ownerOnly', lang);
    case 'invite_failed':
      return t('invite.error.inviteFailed', lang);
    default:
      return code;
  }
}
