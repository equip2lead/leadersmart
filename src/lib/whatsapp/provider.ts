// The contract every WhatsApp provider implements.
//
// The interface exists because the provider is expected to change. Wamatas is
// an unofficial gateway — cheap and immediate, with no template approval — and
// Meta's Cloud API is the opposite: slow to set up, but the only one that
// survives a policy crackdown. A church may well move between them, so nothing
// above this file learns which one is in use.
//
// Nothing here throws. A send failure is a value, not an exception: a rota is
// published whether or not the messages land, and an unhandled rejection deep
// in a loop would take the whole publish with it.

export type WhatsAppSendResult =
  | {
      ok: true;
      /** Null when the provider accepted the send but named no message.
          Deliberately nullable rather than a placeholder: an earlier version
          substituted the string 'unknown', which made "we have no reference"
          indistinguishable from "the reference is literally unknown" and hid
          the fact that every single send was untracked. Null is a fact; a
          fake id is a lie that queries cannot see through. */
      providerMessageId: string | null;
      /** Set when the send succeeded but something about the response is worth
          noticing — currently only a missing message id. */
      warning?: 'no_message_id_in_response';
      /** The provider's unmodified body, kept for the send log. */
      raw?: unknown;
    }
  | {
      ok: false;
      error: string;
      /** True when the same call could plausibly succeed later — a timeout, a
          5xx, a rate limit. False for anything the caller must fix first: a
          bad token, an unregistered template, a malformed number. Retrying a
          non-retryable failure just burns quota. */
      retryable: boolean;
      /** Present whenever the provider answered at all. Absent for transport
          failures, where there is no body to keep. */
      raw?: unknown;
    };

export type WhatsAppProviderName = 'wamatas' | 'genuka' | 'meta_cloud';

export interface WhatsAppProvider {
  name: WhatsAppProviderName;

  sendText(params: { to: string; message: string }): Promise<WhatsAppSendResult>;

  /** Template sends. Required by Meta for anything outside a 24-hour customer
      service window, which is most of what this product wants to send. */
  sendTemplate(params: {
    to: string;
    templateName: string;
    languageCode: string;
    components: unknown[];
  }): Promise<WhatsAppSendResult>;

  checkPhone(phone: string): Promise<{ isOnWhatsApp: boolean }>;
}

/**
 * Normalise a phone number to digits, keeping a leading +.
 *
 * Volunteer numbers are typed by people and arrive with spaces, dashes and
 * brackets. Gateways generally want bare digits, and the ones that don't are
 * forgiving about the plus. This does not attempt to add a country code: a
 * local-format number is a data problem the church has to fix, and silently
 * guessing +237 would send messages to whoever holds that number elsewhere.
 */
export function normalisePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/** Cheap sanity check before spending a request on a number that cannot work.
    Deliberately loose — international formats vary more than any regex worth
    maintaining. */
export function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}
