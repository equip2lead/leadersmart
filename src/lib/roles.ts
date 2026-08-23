import type { UserRole } from './types';

// Role groups drive requireRole() calls throughout the app. Every group
// includes both the current names ('owner', 'admin_pastor', ...) and the
// legacy names ('senior_pastor', 'pastor', ...) so users provisioned
// pre-migration continue to authorise correctly during Phase 2. Once
// legacy enum values are dropped, the legacy entries can go too.

export const ADMIN_ROLES: readonly UserRole[] = [
  'owner',
  'admin_pastor',
  'senior_pastor',
  'admin',
];

export const PASTOR_ROLES: readonly UserRole[] = [
  'admin_pastor',
  'pastor',
];

export const LEADER_ROLES: readonly UserRole[] = [
  'department_head',
  'department_leader',
];

export const KIDS_ROLES: readonly UserRole[] = [
  ...ADMIN_ROLES,
  ...LEADER_ROLES,
  'fire_kids_coordinator',
];

// Owner is a single specific role — the church founder. There is no
// legacy alias: pre-migration, senior_pastor could be either owner or
// admin_pastor depending on creation order. The DB migration already
// picked the right one, so 'senior_pastor' here would be ambiguous.
export const OWNER_ROLES: readonly UserRole[] = ['owner'];

// Roles that unlock the Fire Kids Coordinator toolset.
export const FIRE_KIDS_ROLES: readonly UserRole[] = [
  'owner',
  'fire_kids_coordinator',
];

// Roles allowed to load the Pastor-of-the-Month pages (Sunday checklist,
// weekly plan, monthly report, evaluations). Admins get access so they
// can act on behalf of the current PoM; the page decides whether to
// render the "you are helping X" attribution banner or the normal flow.
export const PASTOR_PAGE_ACCESS: readonly UserRole[] = [
  ...ADMIN_ROLES,
  ...PASTOR_ROLES,
];

// Roles allowed to load the department pages (leader dashboard, team,
// schedules, attendance, weekly report). Admins get access for the same
// on-behalf-of reason.
export const LEADER_PAGE_ACCESS: readonly UserRole[] = [
  ...ADMIN_ROLES,
  ...LEADER_ROLES,
];

export function isOwner(role: UserRole): boolean {
  return role === 'owner';
}

export function isAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isPastor(role: UserRole): boolean {
  return PASTOR_ROLES.includes(role);
}

export function isLeader(role: UserRole): boolean {
  return LEADER_ROLES.includes(role);
}

// Post-login destination for a role. Owners and admins share /admin;
// pastors get /pastor; department leaders get /leader; the Fire Kids
// coordinator (a specialised role with no dashboard yet) falls back to
// /admin for now so they can access the users/kids screens.
export function homeForRole(role: UserRole): string {
  if (isAdmin(role)) return '/admin';
  if (isPastor(role)) return '/pastor';
  if (isLeader(role)) return '/leader';
  if (role === 'fire_kids_coordinator') return '/admin';
  return '/admin';
}

// UI label key. Owners still read as "Senior Pastor" per the product
// decision; the Owner badge is rendered separately alongside the name.
export function roleLabelKey(role: UserRole): string {
  return `role.${role}`;
}
