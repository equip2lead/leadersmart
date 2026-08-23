import { CreditCard } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { OwnerToolShell } from '../_owner-tool-shell';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const { user } = await requireRole(OWNER_ROLES);
  return (
    <OwnerToolShell
      titleKey="owner.billing.title"
      subtitleKey="owner.billing.subtitle"
      bodyKey="owner.billing.body"
      icon={CreditCard}
      lang={user.preferred_language}
    />
  );
}
