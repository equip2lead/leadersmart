import { requireRole } from '@/lib/auth';
import { KioskScreen } from './_screen';

export const dynamic = 'force-dynamic';

export default async function KioskPage() {
  const { user, church } = await requireRole([
    'senior_pastor',
    'admin',
    'department_leader',
  ]);

  return (
    <KioskScreen
      churchId={church.id}
      churchName={church.name}
      operatorName={user.full_name}
    />
  );
}
