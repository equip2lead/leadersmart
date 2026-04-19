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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/lib/i18n';
import type { AppLanguage, UserRole } from '@/lib/types';

type NavItem = { href: string; labelKey: string; icon: LucideIcon };

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/admin/pastors', labelKey: 'nav.pastors', icon: Star },
  { href: '/admin/departments', labelKey: 'admin.departments.page', icon: Building2 },
  { href: '/admin/users', labelKey: 'nav.users', icon: UserCog },
  { href: '/kids/manage', labelKey: 'nav.kids', icon: Baby },
  { href: '/kiosk', labelKey: 'nav.kiosk', icon: Monitor },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

const PASTOR_NAV: NavItem[] = [
  { href: '/pastor', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/pastor/sunday-checklist', labelKey: 'nav.sunday', icon: ClipboardCheck },
  { href: '/pastor/weekly-plan', labelKey: 'nav.plan', icon: CalendarCheck },
  { href: '/pastor/monthly-report', labelKey: 'nav.report', icon: FileText },
  { href: '/pastor/evaluations', labelKey: 'nav.evaluations', icon: Star },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

const LEADER_NAV: NavItem[] = [
  { href: '/leader', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/leader/team', labelKey: 'nav.team', icon: Users },
  { href: '/leader/schedules', labelKey: 'nav.schedules', icon: CalendarDays },
  { href: '/leader/attendance', labelKey: 'nav.attendance', icon: ClipboardCheck },
  { href: '/leader/report', labelKey: 'nav.weeklyReport', icon: FileText },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'senior_pastor':
    case 'admin':
      return ADMIN_NAV;
    case 'pastor':
      return PASTOR_NAV;
    case 'department_leader':
      return LEADER_NAV;
  }
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
  const items = navForRole(role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white md:flex">
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-5">
        <Flame className="h-6 w-6 text-flame-600" aria-hidden="true" />
        <span className="text-lg font-bold text-ink">LeaderSmart</span>
      </div>

      <div className="border-b border-gray-100 px-6 py-4">
        <p className="truncate text-sm font-semibold text-ink">{churchName}</p>
        <p className="truncate text-xs text-muted">{userName}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
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
                      ? 'bg-brand-50 text-brand-700'
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
