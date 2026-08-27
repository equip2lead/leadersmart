'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Flame,
  LayoutDashboard,
  ClipboardCheck,
  CalendarCheck,
  FileText,
  Star,
  Users,
  CalendarDays,
  Baby,
  Settings,
  LogOut,
  UserCog,
  Building2,
  Monitor,
  CreditCard,
  ArrowRightLeft,
  AlertTriangle,
  History,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/lib/i18n';
import { isAdmin, isLeader, isOwner } from '@/lib/roles';
import type { AppLanguage, UserRole } from '@/lib/types';

type NavItem = { href: string; labelKey: string; icon: LucideIcon };
type NavSection = { titleKey: string; items: NavItem[] };

// Admin nav — 5 grouped sections. Both Owner and Admin Pastor see all
// of them; the Owner Tools section below is layered on top for Owner
// only. Legacy 'senior_pastor' + 'admin' also route here.
const ADMIN_SECTIONS: NavSection[] = [
  {
    titleKey: 'nav.section.overview',
    items: [
      { href: '/admin', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { href: '/admin/assignments', labelKey: 'nav.pastors', icon: Star },
      { href: '/admin/departments', labelKey: 'admin.departments.page', icon: Building2 },
      { href: '/admin/users', labelKey: 'nav.users', icon: UserCog },
      { href: '/admin/analytics', labelKey: 'nav.reportsAnalytics', icon: BarChart3 },
    ],
  },
  {
    titleKey: 'nav.section.pastor',
    items: [
      { href: '/pastor/sunday-checklist', labelKey: 'nav.sunday', icon: ClipboardCheck },
      { href: '/pastor/weekly-plan', labelKey: 'nav.plan', icon: CalendarCheck },
      { href: '/pastor/monthly-report', labelKey: 'nav.report', icon: FileText },
      { href: '/pastor/evaluations', labelKey: 'nav.evaluations', icon: Star },
    ],
  },
  {
    titleKey: 'nav.section.department',
    items: [
      { href: '/admin/schedules', labelKey: 'nav.allSchedules', icon: CalendarDays },
      { href: '/admin/attendance', labelKey: 'nav.allAttendance', icon: ClipboardCheck },
      { href: '/admin/weekly-reports', labelKey: 'nav.allReports', icon: FileText },
    ],
  },
  {
    titleKey: 'nav.section.kids',
    items: [
      { href: '/kids/manage', labelKey: 'nav.kids', icon: Baby },
      { href: '/kiosk', labelKey: 'nav.kiosk', icon: Monitor },
    ],
  },
  {
    titleKey: 'nav.section.settings',
    items: [
      { href: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

// Legacy dedicated pastor sidebar — kept for the rare pre-migration
// account that still carries role='pastor' without being invited via
// the current model. Any account with the current 'admin_pastor' role
// gets the full ADMIN_SECTIONS view instead.
const PASTOR_NAV: NavItem[] = [
  { href: '/pastor', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/pastor/sunday-checklist', labelKey: 'nav.sunday', icon: ClipboardCheck },
  { href: '/pastor/weekly-plan', labelKey: 'nav.plan', icon: CalendarCheck },
  { href: '/pastor/monthly-report', labelKey: 'nav.report', icon: FileText },
  { href: '/pastor/evaluations', labelKey: 'nav.evaluations', icon: Star },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

// Department Head sidebar — scoped to their own department; unchanged
// per the course-correction spec.
const LEADER_NAV: NavItem[] = [
  { href: '/leader', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/leader/team', labelKey: 'nav.team', icon: Users },
  { href: '/leader/schedules', labelKey: 'nav.schedules', icon: CalendarDays },
  { href: '/leader/attendance', labelKey: 'nav.attendance', icon: ClipboardCheck },
  { href: '/leader/report', labelKey: 'nav.weeklyReport', icon: FileText },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

// Owner-only tools rendered as a separate labelled section under the
// admin sections. Pages are Phase 3 stubs (billing/transfer/danger)
// plus the working audit log.
const OWNER_TOOLS: NavItem[] = [
  { href: '/admin/audit-log', labelKey: 'nav.owner.auditLog', icon: History },
  { href: '/settings/billing', labelKey: 'nav.owner.billing', icon: CreditCard },
  { href: '/settings/transfer-ownership', labelKey: 'nav.owner.transfer', icon: ArrowRightLeft },
  { href: '/settings/danger', labelKey: 'nav.owner.danger', icon: AlertTriangle },
];

function NavList({
  items,
  pathname,
  lang,
}: {
  items: NavItem[];
  pathname: string;
  lang: AppLanguage;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-indigo-royal-50 text-indigo-royal-700'
                  : 'text-body hover:bg-gray-50 hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(item.labelKey, lang)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="mt-4 mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted first:mt-0">
      {title}
    </p>
  );
}

export function Sidebar({
  role,
  userName,
  churchName,
  lang,
}: {
  role: UserRole;
  userName: string;
  churchName: string;
  lang: AppLanguage;
}) {
  const pathname = usePathname();
  const showOwnerTools = isOwner(role);
  const showAdminSidebar = isAdmin(role); // Owner + admin_pastor + legacy admins
  const showLeaderSidebar = !showAdminSidebar && isLeader(role);
  // Legacy accounts still on role='pastor' (never invited via the
  // current model) fall through to the pastor-only sidebar.

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white md:flex">
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-5">
        <Flame className="h-6 w-6 text-gold-warm-600" aria-hidden="true" />
        <span className="text-lg font-bold text-ink">LeaderSmart</span>
      </div>

      <div className="border-b border-gray-100 px-6 py-4">
        <p className="truncate text-sm font-semibold text-ink">{churchName}</p>
        <div className="flex items-center gap-2">
          <p className="truncate text-xs text-muted">{userName}</p>
          {showOwnerTools && (
            <span
              className="inline-flex shrink-0 items-center rounded-full bg-gold-warm-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-warm-700"
              title={t('nav.owner.badgeTitle', lang)}
            >
              {t('nav.owner.badge', lang)}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {showAdminSidebar ? (
          <>
            {ADMIN_SECTIONS.map((section) => (
              <div key={section.titleKey}>
                <SectionHeader title={t(section.titleKey, lang)} />
                <NavList items={section.items} pathname={pathname} lang={lang} />
              </div>
            ))}
            {showOwnerTools && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <SectionHeader title={t('nav.owner.section', lang)} />
                <NavList items={OWNER_TOOLS} pathname={pathname} lang={lang} />
              </div>
            )}
          </>
        ) : showLeaderSidebar ? (
          <NavList items={LEADER_NAV} pathname={pathname} lang={lang} />
        ) : (
          <NavList items={PASTOR_NAV} pathname={pathname} lang={lang} />
        )}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-gray-50 hover:text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('nav.signout', lang)}
          </button>
        </form>
      </div>
    </aside>
  );
}
