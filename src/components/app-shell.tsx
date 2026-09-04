import { Sidebar } from './sidebar';
import { LanguageToggle } from './language-toggle';
import type { Church, User } from '@/lib/types';

export function AppShell({
  user,
  church,
  children,
}: {
  user: User;
  church: Church;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        role={user.role}
        userName={user.full_name}
        churchName={church.name}
        lang={user.preferred_language}
        orgType={church.organization_type}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
          <span className="text-lg font-bold text-ink md:hidden">
            equip2lead
            <span className="mx-1.5 font-normal text-gray-300" aria-hidden="true">
              |
            </span>
            <span className="text-indigo-royal-700">Coaching</span>
          </span>
          <div className="ml-auto">
            <LanguageToggle current={user.preferred_language} />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
