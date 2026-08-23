'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { createTeamMember, updateTeamMember } from './actions';

export type MemberFormInitial = {
  id?: string;
  full_name: string;
  phone: string;
  role_in_team: string | null;
  photo_url: string | null;
};

export function MemberForm({
  mode,
  departmentId,
  initial,
  lang,
  onDone,
}: {
  mode: 'create' | 'edit';
  departmentId: string;
  initial: MemberFormInitial;
  lang: AppLanguage;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [role, setRole] = useState(initial.role_in_team ?? '');
  const [photoUrl, setPhotoUrl] = useState(initial.photo_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('full_name', fullName);
    fd.set('phone', phone);
    fd.set('role_in_team', role);
    fd.set('photo_url', photoUrl);

    startTransition(async () => {
      const res =
        mode === 'edit' && initial.id
          ? await updateTeamMember(initial.id, fd)
          : await createTeamMember(departmentId, fd);
      if (!res.ok) {
        setError(errorMessage(res.error, lang));
        return;
      }
      if (mode === 'create') {
        setFullName('');
        setPhone('');
        setRole('');
        setPhotoUrl('');
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <div>
        <label className="label" htmlFor={`tm-name-${mode}`}>
          {t('team.form.name', lang)}
        </label>
        <input
          id={`tm-name-${mode}`}
          className="input"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor={`tm-phone-${mode}`}>
          {t('team.form.phone', lang)}
        </label>
        <input
          id={`tm-phone-${mode}`}
          className="input"
          type="tel"
          required
          placeholder="+237 6XX XX XX XX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">{t('team.form.phoneHint', lang)}</p>
      </div>
      <div>
        <label className="label" htmlFor={`tm-role-${mode}`}>
          {t('team.form.role', lang)}
        </label>
        <input
          id={`tm-role-${mode}`}
          className="input"
          placeholder={t('team.form.rolePlaceholder', lang)}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor={`tm-photo-${mode}`}>
          {t('team.form.photo', lang)}
        </label>
        <input
          id={`tm-photo-${mode}`}
          className="input"
          type="url"
          placeholder="https://…"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending
          ? t('common.loading', lang)
          : mode === 'edit'
            ? t('common.save', lang)
            : t('team.form.submitCreate', lang)}
      </button>
    </form>
  );
}

function errorMessage(code: string, lang: AppLanguage): string {
  switch (code) {
    case 'name_required':
      return t('team.error.nameRequired', lang);
    case 'invalid_phone':
      return t('team.error.invalidPhone', lang);
    case 'unauthorized':
      return t('team.error.unauthorized', lang);
    case 'not_found':
      return t('team.error.notFound', lang);
    default:
      return code;
  }
}
