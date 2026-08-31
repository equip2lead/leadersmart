import { t } from './i18n';
import type { AppLanguage, OrganizationType } from './types';

// One place that decides what a concept is *called* for a given org type.
// Churches run departments led by department heads and meet on Sunday;
// ministries run teams led by team leaders and work by the week. The
// database is identical for both — `departments`, `admin_pastor`,
// `pastor_assignments` — and nothing here renames a table, a column, or
// an enum value. This is display only.
//
// The map holds i18n *keys* rather than English literals, so a vocabulary
// entry is translated like every other string instead of becoming a
// second, English-only copy of the dictionary.

const KEYS = {
  church: {
    orgTypeLabel: 'vocab.church.orgTypeLabel',
    orgProfileTitle: 'vocab.church.orgProfileTitle',
    orgNameLabel: 'vocab.church.orgNameLabel',
    orgNamePlaceholder: 'vocab.church.orgNamePlaceholder',
    adminRole: 'vocab.church.adminRole',
    adminRolePlural: 'vocab.church.adminRolePlural',
    inviteAdminsTitle: 'vocab.church.inviteAdminsTitle',
    inviteAdminsSub: 'vocab.church.inviteAdminsSub',
    department: 'vocab.church.department',
    departments: 'vocab.church.departments',
    departmentHead: 'vocab.church.departmentHead',
    ownerLabel: 'vocab.church.ownerLabel',
    addUnitTitle: 'vocab.church.addUnitTitle',
    weeklyChecklist: 'vocab.church.weeklyChecklist',
    weeklyPeriod: 'vocab.church.weeklyPeriod',
    pomLabel: 'vocab.church.pomLabel',
    dashboardTitle: 'vocab.church.dashboardTitle',
    pastorAssignments: 'vocab.church.pastorAssignments',
  },
  ministry: {
    orgTypeLabel: 'vocab.ministry.orgTypeLabel',
    orgProfileTitle: 'vocab.ministry.orgProfileTitle',
    orgNameLabel: 'vocab.ministry.orgNameLabel',
    orgNamePlaceholder: 'vocab.ministry.orgNamePlaceholder',
    adminRole: 'vocab.ministry.adminRole',
    adminRolePlural: 'vocab.ministry.adminRolePlural',
    inviteAdminsTitle: 'vocab.ministry.inviteAdminsTitle',
    inviteAdminsSub: 'vocab.ministry.inviteAdminsSub',
    department: 'vocab.ministry.department',
    departments: 'vocab.ministry.departments',
    departmentHead: 'vocab.ministry.departmentHead',
    ownerLabel: 'vocab.ministry.ownerLabel',
    addUnitTitle: 'vocab.ministry.addUnitTitle',
    weeklyChecklist: 'vocab.ministry.weeklyChecklist',
    weeklyPeriod: 'vocab.ministry.weeklyPeriod',
    pomLabel: 'vocab.church.pomLabel', // unreachable: showPom is false
    dashboardTitle: 'vocab.ministry.dashboardTitle',
    pastorAssignments: 'vocab.ministry.pastorAssignments',
  },
} as const;

export type Vocab = {
  orgTypeLabel: string;
  orgProfileTitle: string;
  orgNameLabel: string;
  orgNamePlaceholder: string;
  adminRole: string;
  adminRolePlural: string;
  inviteAdminsTitle: string;
  inviteAdminsSub: string;
  department: string;
  departments: string;
  departmentHead: string;
  /** Church keeps the existing "Senior Pastor" reading; ministries say Founder. */
  ownerLabel: string;
  /** Full phrase, not a token: French gender differs (un département / une équipe). */
  addUnitTitle: string;
  weeklyChecklist: string;
  weeklyPeriod: string;
  /** Pastor of the Month is a church concept; ministries hide it entirely. */
  showPom: boolean;
  /** null whenever showPom is false, so a stray render can't print a label. */
  pomLabel: string | null;
  dashboardTitle: string;
  pastorAssignments: string;
};

// Resolved strings rather than keys, so callsites read as
// `v.departments` instead of `t(v.departments, lang)` and can't forget
// the language. `t` is synchronous and pure, which is why this works
// unchanged in both server and client components — no hook or provider
// is needed, and no server-only import leaks into a client bundle.
export function getVocab(
  orgType: OrganizationType,
  lang: AppLanguage,
): Vocab {
  const k = KEYS[orgType];
  const isChurch = orgType === 'church';
  return {
    orgTypeLabel: t(k.orgTypeLabel, lang),
    orgProfileTitle: t(k.orgProfileTitle, lang),
    orgNameLabel: t(k.orgNameLabel, lang),
    orgNamePlaceholder: t(k.orgNamePlaceholder, lang),
    adminRole: t(k.adminRole, lang),
    adminRolePlural: t(k.adminRolePlural, lang),
    inviteAdminsTitle: t(k.inviteAdminsTitle, lang),
    inviteAdminsSub: t(k.inviteAdminsSub, lang),
    department: t(k.department, lang),
    departments: t(k.departments, lang),
    departmentHead: t(k.departmentHead, lang),
    ownerLabel: t(k.ownerLabel, lang),
    addUnitTitle: t(k.addUnitTitle, lang),
    weeklyChecklist: t(k.weeklyChecklist, lang),
    weeklyPeriod: t(k.weeklyPeriod, lang),
    showPom: isChurch,
    pomLabel: isChurch ? t(k.pomLabel, lang) : null,
    dashboardTitle: t(k.dashboardTitle, lang),
    pastorAssignments: t(k.pastorAssignments, lang),
  };
}

// Display label for a stored role. The DB value never changes — an
// admin_pastor is still 'admin_pastor' — but a ministry shows them as
// Admin Leaders and a department_head as a Team Leader. Any role without
// vocabulary of its own falls through to the caller's existing label.
export function roleDisplayName(
  role: string,
  orgType: OrganizationType,
  lang: AppLanguage,
): string | null {
  const v = getVocab(orgType, lang);
  if (role === 'admin_pastor') return v.adminRole;
  if (role === 'department_head') return v.departmentHead;
  // 'department_leader' is the legacy spelling. A ministry should read it
  // as a Team Leader, but a church must keep saying "Department Leader" —
  // mapping it to departmentHead for both would silently retitle it to
  // "Department Head" in English church mode.
  if (role === 'department_leader') {
    return orgType === 'ministry' ? v.departmentHead : null;
  }
  // 'senior_pastor' is the pre-Phase-2 spelling of owner. No rows carry
  // it today, but mapping it here means one surfacing later reads as the
  // org's owner label rather than a legacy church title.
  if (role === 'owner' || role === 'senior_pastor') return v.ownerLabel;
  return null;
}
