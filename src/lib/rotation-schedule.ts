import { FIFTH_SUNDAY_GROUP, ROTATION_GROUPS } from './types';
import type { ServingGroup } from './types';

// Date arithmetic and the assignment algorithm, with no database access at
// all. Everything here takes plain values and returns plain values, which is
// what makes the rotation rules checkable without a church, a session, or a
// round trip.
//
// Dates are 'YYYY-MM-DD' strings throughout, matching the DATE columns they
// come from and go back to. They are never Date objects in flight: a DATE has
// no time and no zone, and `new Date('2026-09-06')` parses as UTC midnight,
// which prints as the 5th anywhere west of Greenwich. Constructing with
// explicit local parts and formatting by hand avoids the whole class of
// one-day-out bugs.

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Every Sunday in a given month, in order. `month` is 1-12. */
export function sundaysInMonth(year: number, month: number): string[] {
  const out: string[] = [];
  const d = new Date(year, month - 1, 1);
  // Step forward to the first Sunday, then every seventh day.
  d.setDate(1 + ((7 - d.getDay()) % 7));
  while (d.getMonth() === month - 1) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export type FifthSunday = { month: number; date: string };

/**
 * Every fifth Sunday in a year.
 *
 * A month has one exactly when it contains five Sundays, which happens four or
 * five times a year depending on where the year starts and whether it is a
 * leap year. Both counts are normal; the caller should not treat five as an
 * anomaly.
 */
export function fifthSundaysInYear(year: number): FifthSunday[] {
  const out: FifthSunday[] = [];
  for (let month = 1; month <= 12; month++) {
    const sundays = sundaysInMonth(year, month);
    if (sundays.length >= 5) out.push({ month, date: sundays[4] });
  }
  return out;
}

/** The next group in the weekly cycle. A NULL previous group means this church
    has no history yet, and the cycle starts at A. E is never "previous" for
    this purpose — see nextRotationGroup's use in planMonth. */
export function nextRotationGroup(previous: ServingGroup | null): ServingGroup {
  if (!previous) return ROTATION_GROUPS[0];
  const i = ROTATION_GROUPS.indexOf(previous);
  // A previous value outside A-D (i.e. E) is not part of the cycle, so the
  // cycle resumes from wherever it actually left off, not from E.
  if (i === -1) return ROTATION_GROUPS[0];
  return ROTATION_GROUPS[(i + 1) % ROTATION_GROUPS.length];
}

export type PlannedSunday = {
  date: string;
  group: ServingGroup;
  isFifthSunday: boolean;
};

/**
 * Which group serves on each Sunday of a month.
 *
 * `lastRotationGroup` is the most recent A-D group this church rostered,
 * whenever that was — not necessarily the previous Sunday, because a fifth
 * Sunday sits outside the cycle and must not advance it. Skipping E is the
 * whole reason this takes the last *rotation* group rather than the last
 * group: otherwise a month ending on a fifth Sunday would restart the cycle
 * at A the following month and one group would serve twice as often.
 */
export function planMonth(
  year: number,
  month: number,
  fifthSundayDates: ReadonlySet<string>,
  lastRotationGroup: ServingGroup | null,
): PlannedSunday[] {
  let previous = lastRotationGroup;
  return sundaysInMonth(year, month).map((date) => {
    if (fifthSundayDates.has(date)) {
      return { date, group: FIFTH_SUNDAY_GROUP, isFifthSunday: true };
    }
    const group = nextRotationGroup(previous);
    previous = group;
    return { date, group, isFifthSunday: false };
  });
}

// ── Assignment ──────────────────────────────────────────────────────────────

export type Candidate = {
  volunteerId: string;
  /** Last date this person served at all, or null if never. */
  lastServed: string | null;
  /** Last date this person served at the station being filled, or null. */
  lastServedHere: string | null;
};

/** Distance in days from `date` back to `since`, or Infinity when the person
    has never served. Infinity is the point: someone brand new outranks
    everyone, which is what "treat as hasn't served" means. */
function daysSince(date: string, since: string | null): number {
  if (!since) return Number.POSITIVE_INFINITY;
  const a = new Date(`${date}T00:00:00`).getTime();
  const b = new Date(`${since}T00:00:00`).getTime();
  return Math.max(0, Math.round((a - b) / 86_400_000));
}

/**
 * Choose who fills one station on one Sunday.
 *
 * Two sorts, in priority order:
 *
 *   1. Longest since serving anywhere. This is the fairness rule and it is
 *      hard — nobody serves twice while someone else waits.
 *   2. Longest since serving *this* station. This is the variety preference
 *      and it is soft: it only ever breaks ties from the first rule, so a
 *      repeat happens when the alternative is leaving the station empty.
 *
 * Remaining ties are broken at random. Deterministic tie-breaking (by id, say)
 * would quietly favour the same people every week, because ids do not change.
 * `random` is injectable so a test can pin it.
 */
export function pickForStation(
  date: string,
  candidates: readonly Candidate[],
  count: number,
  random: () => number = Math.random,
): string[] {
  const scored = candidates.map((c) => ({
    id: c.volunteerId,
    sinceAny: daysSince(date, c.lastServed),
    sinceHere: daysSince(date, c.lastServedHere),
    jitter: random(),
  }));

  scored.sort(
    (a, b) =>
      b.sinceAny - a.sinceAny || b.sinceHere - a.sinceHere || a.jitter - b.jitter,
  );

  return scored.slice(0, Math.max(0, count)).map((s) => s.id);
}

export type StationNeed = {
  stationId: string;
  /** rotation_stations.min_volunteers — defaults to 2 in this schema, not 1. */
  minVolunteers: number;
};

export type SundayPlanResult = {
  date: string;
  group: ServingGroup;
  isFifthSunday: boolean;
  /** Empty when the group has nobody; the caller surfaces that as a warning
      rather than writing an empty schedule. */
  assignments: Array<{ stationId: string; volunteerIds: string[] }>;
  /** Stations that got fewer people than min_volunteers asked for. */
  understaffed: string[];
  /** True when the rostered group has no active volunteers at all. */
  groupEmpty: boolean;
};

/**
 * Fill one Sunday.
 *
 * A volunteer chosen for one station is removed from the pool before the next
 * station is filled — nobody is in two places at once. Stations are processed
 * in the order given, so display_order decides who gets first pick when the
 * group is thin; that is a real editorial choice and it belongs with whoever
 * ordered the stations.
 */
export function planSunday(
  date: string,
  group: ServingGroup,
  isFifthSunday: boolean,
  stations: readonly StationNeed[],
  /** Candidates per station: only those who said they are willing to serve
      there. A station with nobody willing simply goes unfilled. */
  candidatesByStation: ReadonlyMap<string, readonly Candidate[]>,
  random: () => number = Math.random,
): SundayPlanResult {
  const taken = new Set<string>();
  const assignments: Array<{ stationId: string; volunteerIds: string[] }> = [];
  const understaffed: string[] = [];

  let anyCandidates = false;

  for (const station of stations) {
    const pool = (candidatesByStation.get(station.stationId) ?? []).filter(
      (c) => !taken.has(c.volunteerId),
    );
    if ((candidatesByStation.get(station.stationId) ?? []).length > 0) {
      anyCandidates = true;
    }

    const chosen = pickForStation(date, pool, station.minVolunteers, random);
    chosen.forEach((id) => taken.add(id));

    assignments.push({ stationId: station.stationId, volunteerIds: chosen });
    if (chosen.length < station.minVolunteers) {
      understaffed.push(station.stationId);
    }
  }

  return {
    date,
    group,
    isFifthSunday,
    assignments,
    understaffed,
    // "Group empty" means nobody in the group, which is different from
    // "nobody willing to serve at any station" — but from the generator's
    // point of view both produce an empty Sunday, and both want the admin
    // told rather than a blank schedule written silently.
    groupEmpty: !anyCandidates,
  };
}

/** Month label for a selector, in the viewer's language. */
export function monthLabel(year: number, month: number, lang: 'en' | 'fr'): string {
  return new Date(year, month - 1, 1).toLocaleDateString(
    lang === 'fr' ? 'fr-FR' : 'en-US',
    { month: 'long', year: 'numeric' },
  );
}

/** {year, month} for today, and for the month after it. */
export function currentAndNextMonth(): Array<{ year: number; month: number }> {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return [
    { year: y, month: m },
    m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 },
  ];
}
