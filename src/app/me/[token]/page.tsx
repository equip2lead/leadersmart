import { notFound } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { t } from '@/lib/i18n';
import { formatEventDate, todayISO } from '@/lib/events';
import { volunteerByToken } from '@/lib/rotation-signup';
import { Wordmark } from '@/components/wordmark';
import type { RotationAssignment, ServingGroup } from '@/lib/types';

export const dynamic = 'force-dynamic';

// The volunteer's own page. The token in the URL is the entire credential —
// there is no account, no password and no session, because a volunteer is
// usually not an app user and requiring a login is what stops people using it.
//
// What that buys, and what it costs: anyone holding the link can read this
// page, so it shows only what its owner already knows — their name, their
// groups, where they serve and when. No other volunteer's details, no contact
// list, nothing about the church's other business.

type AssignmentRow = RotationAssignment & { station_name: string | null };

export default async function MySchedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const found = await volunteerByToken(token);
  // One 404 for every failure — malformed token, unknown token, missing
  // church. Distinguishing them would turn this page into an oracle for
  // guessing tokens.
  if (!found) notFound();

  const { volunteer, church } = found;
  const lang = church.language;
  const admin = createAdminClient();

  const [groupRes, prefRes, assignRes] = await Promise.all([
    admin
      .from('volunteer_group_memberships')
      .select('serving_group')
      .eq('volunteer_id', volunteer.id)
      .order('serving_group'),
    admin
      .from('volunteer_station_preferences')
      .select('station_id, is_excluded')
      .eq('volunteer_id', volunteer.id)
      .eq('is_excluded', false),
    // Published only. A draft schedule is the admin's working copy, and a
    // volunteer seeing a Sunday that later changes is worse than seeing it
    // late.
    admin
      .from('rotation_assignments')
      .select('*')
      .eq('volunteer_id', volunteer.id)
      .eq('is_published', true)
      .order('service_date', { ascending: true }),
  ]);

  const groups = ((groupRes.data ?? []) as Array<{ serving_group: ServingGroup }>).map(
    (g) => g.serving_group,
  );

  const stationIds = [
    ...new Set(
      [
        ...((prefRes.data ?? []) as Array<{ station_id: string }>).map(
          (p) => p.station_id,
        ),
        ...((assignRes.data ?? []) as RotationAssignment[]).map((a) => a.station_id),
      ].filter(Boolean),
    ),
  ];

  const { data: stationRows } = stationIds.length
    ? await admin.from('rotation_stations').select('id, name').in('id', stationIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const stationName = new Map(
    (stationRows ?? []).map((s) => [s.id as string, s.name as string]),
  );

  const preferredStations = ((prefRes.data ?? []) as Array<{ station_id: string }>)
    .map((p) => stationName.get(p.station_id))
    .filter((n): n is string => !!n);

  const today = todayISO();
  const all: AssignmentRow[] = ((assignRes.data ?? []) as RotationAssignment[]).map(
    (a) => ({ ...a, station_name: stationName.get(a.station_id) ?? null }),
  );
  const upcoming = all.filter((a) => a.service_date >= today);
  // Most recent first: looking back, the last Sunday matters more than the
  // first one ever served.
  const past = all.filter((a) => a.service_date < today).reverse();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <Wordmark size="sm" />
      </div>

      <header className="mt-8">
        <h1 className="font-manrope text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {volunteer.full_name}
        </h1>
        <p className="mt-1 text-sm text-body">
          {church.name} · {t('rotation.me.title', lang)}
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
            {t('rotation.me.groups_heading', lang)}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <span
                key={g}
                className="rounded-full bg-indigo-royal-50 px-2.5 py-1 text-xs font-bold text-indigo-royal-700"
              >
                {t(`rotation.group.${g}`, lang)}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted">
            {t('rotation.me.stations_heading', lang)}
          </h2>
          {preferredStations.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              {t('rotation.me.no_stations', lang)}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preferredStations.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-body"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('rotation.me.upcoming_heading', lang)}
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-body">
            {t('rotation.me.empty', lang)}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-indigo-royal-200 bg-indigo-royal-50 px-4 py-3"
              >
                <CalendarDays
                  className="h-4 w-4 shrink-0 text-indigo-royal-700"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {formatEventDate(a.service_date, lang, { weekday: true })}
                  </p>
                  {a.station_name && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-indigo-royal-800">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {a.station_name}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('rotation.me.past_heading', lang)}
        </h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('rotation.me.past_empty', lang)}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {past.slice(0, 12).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5"
              >
                <span className="text-sm text-body">
                  {formatEventDate(a.service_date, lang)}
                </span>
                {a.station_name && (
                  <span className="text-xs text-muted">{a.station_name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
