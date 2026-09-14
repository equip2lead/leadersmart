import 'server-only';

import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { t } from '@/lib/i18n';
import { formatEventDate } from '@/lib/events';
import { getWhatsAppProvider } from './factory';
import { logWhatsAppSend } from './log';
import { formatEventTime } from '@/lib/events';
import type { AppLanguage } from '@/lib/types';

// Assignment notifications, fired when a Sunday is published.
//
// Every decision here is shaped by one rule: publishing a rota must succeed
// whether or not the messages land. A church with no WhatsApp configured, an
// expired token, a gateway that is down — none of those may turn a successful
// publish into an error the admin has to decipher. So this returns a summary
// and never throws.

export type NotifySummary = { attempted: number; sent: number; failed: number };

/** Sends are spaced rather than fired at once. A Sunday with twenty
    assignments is twenty requests, and an unofficial gateway will rate-limit
    or drop a burst like that. Two hundred milliseconds is slow enough to be
    polite and fast enough that twenty sends finish in four seconds. */
const SEND_SPACING_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AssignmentRow = {
  id: string;
  volunteer_id: string | null;
  station_id: string;
  service_time: string | null;
};

/**
 * Notify everyone rostered for one Sunday.
 *
 * Returns zeros — not an error — whenever sending is impossible, because the
 * caller's response is identical in all those cases: carry on, the schedule is
 * published.
 */
export async function notifyRotationAssignments(
  churchId: string,
  serviceDate: string,
  churchLang: AppLanguage,
): Promise<NotifySummary> {
  const empty: NotifySummary = { attempted: 0, sent: 0, failed: 0 };

  try {
    const provider = await getWhatsAppProvider(churchId);
    // Null means no config, not enabled, missing credentials, or a provider
    // with no adapter. All of them mean "skip quietly".
    if (!provider) return empty;
    if (!hasAdminKey()) return empty;

    const admin = createAdminClient();

    const { data: assignmentRows } = await admin
      .from('rotation_assignments')
      .select('id, volunteer_id, station_id, service_time')
      .eq('church_id', churchId)
      .eq('service_date', serviceDate);
    const assignments = (assignmentRows ?? []) as AssignmentRow[];
    if (assignments.length === 0) return empty;

    const volunteerIds = [
      ...new Set(assignments.map((a) => a.volunteer_id).filter(Boolean)),
    ] as string[];
    const stationIds = [...new Set(assignments.map((a) => a.station_id))];

    const [volRes, stationRes] = await Promise.all([
      volunteerIds.length
        ? admin
            .from('volunteers')
            .select('id, full_name, whatsapp_phone, user_id')
            .in('id', volunteerIds)
        : Promise.resolve({ data: [] }),
      admin.from('rotation_stations').select('id, name').in('id', stationIds),
    ]);

    const volunteers = new Map(
      ((volRes.data ?? []) as Array<{
        id: string;
        full_name: string;
        whatsapp_phone: string | null;
        user_id: string | null;
      }>).map((v) => [v.id, v]),
    );
    const stationName = new Map(
      ((stationRes.data ?? []) as Array<{ id: string; name: string }>).map((s) => [
        s.id,
        s.name,
      ]),
    );

    // Language per volunteer. The volunteers table has no preferred_language
    // of its own, so the only per-person signal available is the linked user
    // account — which exists for in-app opt-ins and not for public sign-ups.
    // Everyone else gets the church's language.
    const linkedUserIds = [
      ...new Set(
        [...volunteers.values()].map((v) => v.user_id).filter(Boolean) as string[],
      ),
    ];
    const { data: userRows } = linkedUserIds.length
      ? await admin
          .from('users')
          .select('id, preferred_language')
          .in('id', linkedUserIds)
      : { data: [] };
    const langByUser = new Map(
      ((userRows ?? []) as Array<{ id: string; preferred_language: AppLanguage }>).map(
        (u) => [u.id, u.preferred_language],
      ),
    );

    const summary: NotifySummary = { attempted: 0, sent: 0, failed: 0 };

    // Sequential with spacing rather than a parallel fan-out. The brief asked
    // for allSettled *and* a 200ms gap, which cannot both hold — a parallel
    // batch has no gap between its members. Spacing is the part that protects
    // the gateway, and awaiting in order gives the same "collect every
    // outcome, never abort on one failure" behaviour allSettled was for.
    for (const assignment of assignments) {
      if (!assignment.volunteer_id) continue;
      const volunteer = volunteers.get(assignment.volunteer_id);
      if (!volunteer) continue;

      const phone = volunteer.whatsapp_phone?.trim();
      // A volunteer with no number is not a failure to report — there was
      // never a message to send.
      if (!phone) continue;

      const lang =
        (volunteer.user_id ? langByUser.get(volunteer.user_id) : undefined) ??
        churchLang;

      const time = formatEventTime(assignment.service_time);
      const message = t(
        time
          ? 'whatsapp.messages.rotation_assignment'
          : 'whatsapp.messages.rotation_assignment_no_time',
        lang,
      )
        .replace('{name}', volunteer.full_name)
        .replace('{station}', stationName.get(assignment.station_id) ?? '—')
        .replace('{date}', formatEventDate(serviceDate, lang, { weekday: true }))
        .replace('{time}', time ?? '');

      summary.attempted += 1;

      if (summary.attempted > 1) await sleep(SEND_SPACING_MS);

      const result = await provider.sendText({ to: phone, message });
      if (result.ok) summary.sent += 1;
      else summary.failed += 1;

      await logWhatsAppSend({
        churchId,
        volunteerId: volunteer.id,
        userId: volunteer.user_id,
        purpose: 'rotation_assignment',
        phone,
        message,
        provider: provider.name,
        result,
      });
    }

    return summary;
  } catch (err) {
    // Nothing above is allowed to break a publish. A thrown error here is a
    // bug worth seeing in the logs, but the schedule is already published and
    // the admin should not be told otherwise.
    console.error('[whatsapp] rotation notification failed', err);
    return empty;
  }
}
