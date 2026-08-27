'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { MemberForm } from './_member-form';
import { setTeamMemberActive } from './actions';

export type MemberRow = {
  id: string;
  full_name: string;
  phone: string;
  role_in_team: string | null;
  photo_url: string | null;
  is_active: boolean;
  joined_date: string | null;
};

export function TeamMemberRow({
  member,
  departmentId,
  lang,
}: {
  member: MemberRow;
  departmentId: string;
  lang: AppLanguage;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setTeamMemberActive(member.id, !member.is_active);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink">{t('team.editing', lang)}</p>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-muted hover:text-ink"
              aria-label={t('common.cancel', lang)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <MemberForm
            mode="edit"
            departmentId={departmentId}
            initial={{
              id: member.id,
              full_name: member.full_name,
              phone: member.phone,
              role_in_team: member.role_in_team,
              photo_url: member.photo_url,
            }}
            lang={lang}
            onDone={() => setEditing(false)}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {member.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photo_url}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-royal-50 text-xs font-semibold text-indigo-royal-700">
              {member.full_name.slice(0, 1)}
            </div>
          )}
          <span className="text-sm font-medium text-ink">{member.full_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-body">{member.phone}</td>
      <td className="px-4 py-3 text-sm text-body">{member.role_in_team ?? '—'}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            member.is_active
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {member.is_active
            ? t('team.status.active', lang)
            : t('team.status.inactive', lang)}
        </span>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {error}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-royal-700 hover:bg-indigo-royal-50"
          >
            <Pencil className="h-3 w-3" />
            {t('common.edit', lang)}
          </button>
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className="rounded-md px-2 py-1 text-xs font-medium text-body hover:bg-gray-50 disabled:opacity-50"
          >
            {member.is_active
              ? t('team.deactivate', lang)
              : t('team.reactivate', lang)}
          </button>
        </div>
      </td>
    </tr>
  );
}
