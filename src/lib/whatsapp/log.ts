import 'server-only';

import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import type { WhatsAppProviderName, WhatsAppSendResult } from './provider';

// The delivery log.
//
// Written with the service role because whatsapp_send_log has no INSERT policy
// at all — that is what makes it append-only from any authenticated client's
// point of view, and it means a send record cannot be forged or revised by
// someone who merely has an admin session.

/** Enough of the message to recognise it in a log, not enough to be an archive
    of what was said to each volunteer. */
const PREVIEW_LENGTH = 100;

export type SendPurpose =
  | 'test'
  | 'rotation_assignment'
  | 'rotation_reminder';

export type LogEntry = {
  churchId: string;
  volunteerId?: string | null;
  userId?: string | null;
  purpose: SendPurpose;
  phone: string;
  message: string;
  provider: WhatsAppProviderName;
  result: WhatsAppSendResult;
};

/**
 * Record one send attempt.
 *
 * Never throws and never returns a failure. A log write that fails must not
 * turn a message that was actually delivered into an error the user sees, nor
 * abort the loop that is still sending to everyone else. Losing a log line is
 * a much smaller problem than either.
 */
export async function logWhatsAppSend(entry: LogEntry): Promise<void> {
  try {
    if (!hasAdminKey()) return;
    const admin = createAdminClient();
    await admin.from('whatsapp_send_log').insert({
      church_id: entry.churchId,
      volunteer_id: entry.volunteerId ?? null,
      user_id: entry.userId ?? null,
      purpose: entry.purpose,
      phone: entry.phone,
      message_preview: entry.message.slice(0, PREVIEW_LENGTH),
      provider: entry.provider,
      // Null, not a placeholder, when the provider named no message. A query
      // for untracked sends is `WHERE status='sent' AND provider_message_id IS
      // NULL`, which only works if the column tells the truth.
      provider_message_id: entry.result.ok ? entry.result.providerMessageId : null,
      status: entry.result.ok ? 'sent' : 'failed',
      // A successful send with a warning records it here rather than in a
      // column of its own — error_message is already "what was odd about this
      // send", and a second nearly-identical column would just drift.
      error_message: entry.result.ok
        ? (entry.result.warning ?? null)
        : entry.result.error,
      // Stored on success and failure alike: a rejection body is as
      // diagnostic as an acceptance.
      raw_response: (entry.result.raw ?? null) as object | null,
    });
  } catch {
    // Swallowed on purpose — see the doc comment.
  }
}
