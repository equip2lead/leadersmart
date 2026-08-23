import { AlertTriangle } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { OwnerToolShell } from '../_owner-tool-shell';

export const dynamic = 'force-dynamic';

export default async function DangerZonePage() {
  const { user } = await requireRole(OWNER_ROLES);
  return (
    <OwnerToolShell
      titleKey="owner.danger.title"
      subtitleKey="owner.danger.subtitle"
      bodyKey="owner.danger.body"
      icon={AlertTriangle}
      lang={user.preferred_language}
    />
  );
}
