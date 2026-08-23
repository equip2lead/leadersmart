import { requireRole } from '@/lib/auth';
import { KIDS_ROLES } from '@/lib/roles';
import { KioskScreen } from './_screen';

export const dynamic = 'force-dynamic';

export default async function KioskPage() {
  const { user, church } = await requireRole(KIDS_ROLES);

  return (
    <KioskScreen
      churchId={church.id}
      churchName={church.name}
      operatorName={user.full_name}
    />
  );
}
