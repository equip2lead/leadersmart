import { ArrowRightLeft } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { OwnerToolShell } from '../_owner-tool-shell';

export const dynamic = 'force-dynamic';

export default async function TransferOwnershipPage() {
  const { user } = await requireRole(OWNER_ROLES);
  return (
    <OwnerToolShell
      titleKey="owner.transfer.title"
      subtitleKey="owner.transfer.subtitle"
      bodyKey="owner.transfer.body"
      icon={ArrowRightLeft}
      lang={user.preferred_language}
    />
  );
}
