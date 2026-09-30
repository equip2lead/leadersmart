import {
  normalisePhone,
  type WhatsAppProvider,
  type WhatsAppSendResult,
} from './provider';

// Wamatas adapter.
//
// Wamatas is an unofficial WhatsApp gateway: it drives a logged-in WhatsApp
// session rather than Meta's Business API. Two consequences shape this file.
// It needs no template approval, which is why Path 1 can ship today. And it
// answers with HTTP 200 even when a send failed, putting the real outcome in
// the body — so status alone is never trusted below.

const BASE_URL = 'https://wamatas.com/api';

/** A hung request must not hold a publish open. Ten seconds is generous for a
    gateway that normally answers in under one. */
const TIMEOUT_MS = 10_000;

type WamatasConfig = {
  accessToken: string;
  instanceId: string;
};

/** Wamatas replies are loosely typed and have changed shape between versions,
    so every field is optional and read defensively. */
type WamatasIdBearing = {
  id?: string;
  message_id?: string;
  messageId?: string;
  msgId?: string;
  key?: { id?: string };
};

type WamatasResponse = WamatasIdBearing & {
  status?: string | boolean;
  message?: string;
  error?: string;
  // Gateways in this family nest the payload inconsistently — sometimes
  // `data`, sometimes `data.data`, sometimes `data.result`. All three are
  // probed rather than assumed.
  data?: WamatasIdBearing & {
    data?: WamatasIdBearing;
    result?: WamatasIdBearing;
  };
};

/** Every place a message id has been observed or is plausible for a
    WhatsApp-Web-based gateway, checked outermost-first.

    Deliberately a list rather than a chain of ?? so the set is greppable and
    so adding a newly-discovered path is a one-line change. Only non-empty
    strings count — some gateways return "" or null in the id slot on a queued
    send, and an empty string is not a reference. */
function messageIdFrom(body: WamatasResponse): string | null {
  const candidates: Array<string | undefined> = [
    body.data?.id,
    body.data?.message_id,
    body.data?.messageId,
    body.data?.msgId,
    body.data?.key?.id,
    body.data?.data?.id,
    body.data?.data?.message_id,
    body.data?.data?.messageId,
    body.data?.data?.key?.id,
    body.data?.result?.id,
    body.data?.result?.message_id,
    body.data?.result?.messageId,
    body.id,
    body.message_id,
    body.messageId,
    body.msgId,
    body.key?.id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c;
  }
  return null;
}

/** Wamatas signals success as `status: true`, `"true"`, or `"success"`
    depending on endpoint and version. Treating anything else as failure is
    safer than treating anything non-false as success. */
function isSuccess(body: WamatasResponse): boolean {
  const s = body.status;
  if (s === true) return true;
  if (typeof s === 'string') {
    const v = s.toLowerCase();
    return v === 'true' || v === 'success' || v === 'ok';
  }
  return false;
}

function errorFrom(body: WamatasResponse, fallback: string): string {
  return body.error ?? body.message ?? fallback;
}

async function post(
  path: string,
  payload: Record<string, unknown>,
): Promise<
  | { ok: true; body: WamatasResponse; raw: unknown }
  | { ok: false; error: string; retryable: boolean; raw?: unknown }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      // Credentials in the body, so a cached response would be both wrong and
      // a small leak.
      cache: 'no-store',
    });

    const text = await res.text();
    let body: WamatasResponse = {};
    try {
      body = text ? (JSON.parse(text) as WamatasResponse) : {};
    } catch {
      // A non-JSON body is usually an HTML error page from in front of the
      // API. Report the status rather than the markup.
      return {
        ok: false,
        error: `non_json_response_${res.status}`,
        retryable: res.status >= 500,
        // Truncated: an HTML error page is worth a glance, not a column.
        raw: { non_json_body: text.slice(0, 500) },
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: errorFrom(body, `http_${res.status}`),
        // 4xx means the request itself is wrong — a bad token, a bad number.
        // Only 5xx and 429 are worth trying again.
        retryable: res.status >= 500 || res.status === 429,
        raw: body,
      };
    }

    return { ok: true, body, raw: body };
  } catch (err) {
    // AbortError is the timeout above; everything else here is a network
    // failure. Both are worth retrying.
    const name = err instanceof Error ? err.name : 'unknown';
    return {
      ok: false,
      error: name === 'AbortError' ? 'timeout' : 'network_error',
      retryable: true,
      // No body: nothing was received, so there is nothing to keep.
    };
  } finally {
    clearTimeout(timer);
  }
}

export function createWamatasProvider(config: WamatasConfig): WhatsAppProvider {
  const credentials = {
    instance_id: config.instanceId,
    access_token: config.accessToken,
  };

  return {
    name: 'wamatas',

    async sendText({ to, message }): Promise<WhatsAppSendResult> {
      const res = await post('send', {
        number: normalisePhone(to),
        type: 'text',
        message,
        ...credentials,
      });
      if (!res.ok) {
        return {
          ok: false,
          error: res.error,
          retryable: res.retryable,
          raw: res.raw,
        };
      }

      if (!isSuccess(res.body)) {
        // HTTP 200 with a failure in the body — the case that makes status
        // codes alone untrustworthy here.
        return {
          ok: false,
          error: errorFrom(res.body, 'send_failed'),
          retryable: false,
          raw: res.raw,
        };
      }

      const providerMessageId = messageIdFrom(res.body);

      // TEMPORARY — remove once a real id field is identified from stored
      // raw_response values. Logs the body of a send that Wamatas accepted
      // without naming a message, which is the case this whole change exists
      // to investigate.
      if (!providerMessageId) {
        console.warn(
          '[wamatas:sendText] accepted with no message id — body:',
          JSON.stringify(res.body),
        );
      }

      // No fabricated id. Null says "the provider named no message", which is
      // a fact a query can act on; the old 'unknown' placeholder said the same
      // thing in a way that looked like data and hid that every send was
      // untracked.
      return {
        ok: true,
        providerMessageId,
        ...(providerMessageId ? {} : { warning: 'no_message_id_in_response' as const }),
        raw: res.raw,
      };
    },

    async sendTemplate(): Promise<WhatsAppSendResult> {
      // TODO(meta-templates): wire POST /api/send_template once templates are
      // registered and approved in Meta Business Manager. Until then this
      // deliberately fails closed rather than falling back to sendText —
      // silently downgrading a template to free text is how a message goes out
      // in the wrong format to the wrong audience, and it would also mask the
      // fact that approval never happened.
      return { ok: false, error: 'not_configured', retryable: false };
    },

    async checkPhone(phone): Promise<{ isOnWhatsApp: boolean }> {
      const res = await post('check_phone', {
        number: normalisePhone(phone),
        ...credentials,
      });
      // Unknown is reported as "not on WhatsApp" only for the caller's
      // convenience; callers must not treat this as authoritative when the
      // gateway is unreachable.
      if (!res.ok) return { isOnWhatsApp: false };
      return { isOnWhatsApp: isSuccess(res.body) };
    },
  };
}
