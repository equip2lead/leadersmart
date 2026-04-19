import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { ChildrenManager } from './_manager';

export const dynamic = 'force-dynamic';

type Child = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  allergies: string | null;
  photo_url: string | null;
  classroom_id: string | null;
  is_active: boolean;
};

type Classroom = {
  id: string;
  name: string;
};

export default async function KidsManagePage() {
  const { user, church } = await requireRole([
    'senior_pastor',
    'admin',
    'department_leader',
  ]);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const [childrenRes, classroomsRes, checkinsRes] = await Promise.all([
    supabase
      .from('children')
      .select(
        'id, full_name, date_of_birth, parent_name, parent_phone, allergies, photo_url, classroom_id, is_active',
      )
      .eq('church_id', church.id)
      .order('full_name', { ascending: true }),
    supabase
      .from('classrooms')
      .select('id, name')
      .eq('church_id', church.id)
      .order('name'),
    supabase
      .from('checkins')
      .select('id, child_id, status, checked_in_at, pickup_code')
      .eq('church_id', church.id)
      .eq('service_date', today)
      .order('checked_in_at', { ascending: false }),
  ]);

  const children = (childrenRes.data ?? []) as Child[];
  const classrooms = (classroomsRes.data ?? []) as Classroom[];
  const checkins = checkinsRes.data ?? [];

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('nav.kids', lang)}
        subtitle="Manage registered children and view today's check-ins."
      />
      <ChildrenManager
        churchId={church.id}
        children={children}
        classrooms={classrooms}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">
          Today&apos;s check-ins ({checkins.length})
        </h2>
        {checkins.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-muted">
            No check-ins yet today.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {checkins.map((c) => {
              const child = children.find((kid) => kid.id === c.child_id);
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {child?.full_name ?? 'Unknown child'}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(c.checked_in_at).toLocaleTimeString()} · code {c.pickup_code}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      c.status === 'picked_up'
                        ? 'bg-gray-100 text-gray-700'
                        : c.status === 'emergency'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
