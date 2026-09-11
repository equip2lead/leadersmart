import { Users } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import type { ServingGroup, Volunteer } from '@/lib/types';
import { VolunteerDirectory, type VolunteerRow } from './_directory';
import { SignupLink } from './_signup-link';

export const dynamic = 'force-dynamic';

export default async function RotationVolunteersPage() {
  // The layout above already refused ministries, opted-out churches and
  // non-admins, so this page reads its data without re-litigating access.
  const { user, church } = await getMe();
  const lang = user.preferred_language;
  const supabase = await createClient();

  const [volRes, configRes] = await Promise.all([
    supabase
      .from('volunteers')
      .select('*')
      .eq('church_id', church.id)
      .order('full_name'),
    supabase
      .from('rotation_config')
      .select('church_slug')
      .eq('church_id', church.id)
      .maybeSingle(),
  ]);

  const volunteers = (volRes.data ?? []) as Volunteer[];
  const slug = (configRes.data?.church_slug as string | null) ?? null;

  const ids = volunteers.map((v) => v.id);
  const [groupRes, prefRes] = await Promise.all([
    ids.length
      ? supabase
          .from('volunteer_group_memberships')
          .select('volunteer_id, serving_group')
          .in('volunteer_id', ids)
      : Promise.resolve({ data: [] as Array<{ volunteer_id: string; serving_group: ServingGroup }> }),
    ids.length
      ? supabase
          .from('volunteer_station_preferences')
          .select('volunteer_id, station_id')
          .eq('is_excluded', false)
          .in('volunteer_id', ids)
      : Promise.resolve({ data: [] as Array<{ volunteer_id: string; station_id: string }> }),
  ]);

  const groupsByVolunteer = new Map<string, ServingGroup[]>();
  for (const g of (groupRes.data ?? []) as Array<{
    volunteer_id: string;
    serving_group: ServingGroup;
  }>) {
    const list = groupsByVolunteer.get(g.volunteer_id) ?? [];
    list.push(g.serving_group);
    groupsByVolunteer.set(g.volunteer_id, list);
  }

  const stationIds = [
    ...new Set(
      ((prefRes.data ?? []) as Array<{ station_id: string }>).map((p) => p.station_id),
    ),
  ];
  const { data: stationRows } = stationIds.length
    ? await supabase.from('rotation_stations').select('id, name').in('id', stationIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const stationName = new Map(
    (stationRows ?? []).map((s) => [s.id as string, s.name as string]),
  );

  const stationsByVolunteer = new Map<string, string[]>();
  for (const p of (prefRes.data ?? []) as Array<{
    volunteer_id: string;
    station_id: string;
  }>) {
    const name = stationName.get(p.station_id);
    if (!name) continue;
    const list = stationsByVolunteer.get(p.volunteer_id) ?? [];
    list.push(name);
    stationsByVolunteer.set(p.volunteer_id, list);
  }

  const rows: VolunteerRow[] = volunteers.map((v) => ({
    id: v.id,
    fullName: v.full_name,
    phone: v.whatsapp_phone,
    email: v.email,
    // A volunteer created before the memberships table existed has no rows
    // there; fall back to the primary group so the column is never blank.
    groups: (groupsByVolunteer.get(v.id) ?? [v.serving_group]).sort(),
    stations: (stationsByVolunteer.get(v.id) ?? []).sort(),
    status: v.status,
    joinedAt: v.joined_at,
    isTestData: v.is_test_data,
  }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('rotation.admin.volunteers.page_title', lang)}
        subtitle={t('rotation.admin.volunteers.page_subtitle', lang)}
      />

      {slug && (
        <div className="mt-6">
          <SignupLink lang={lang} path={`/rotation/${slug}`} />
        </div>
      )}

      <div className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <Users className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-ink">
              {t('rotation.admin.volunteers.empty_title', lang)}
            </p>
            <p className="mt-1 text-sm text-body">
              {t('rotation.admin.volunteers.empty_body', lang)}
            </p>
          </div>
        ) : (
          <VolunteerDirectory
            lang={lang}
            rows={rows}
            canDelete={isOwner(user.role)}
          />
        )}
      </div>
    </div>
  );
}
