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
type WamatasResponse = {
  status?: string | boolean;
  message?: string;
  error?: string;
  data?: { id?: string; message_id?: string; key?: { id?: string } };
  id?: string;
  message_id?: string;
};

function messageIdFrom(body: WamatasResponse): string | null {
  return (
    body.data?.id ??
    body.data?.message_id ??
    body.data?.key?.id ??
    body.id ??
    body.message_id ??
    null
  );
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
  | { ok: true; body: WamatasResponse }
  | { ok: false; error: string; retryable: boolean }
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
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: errorFrom(body, `http_${res.status}`),
        // 4xx means the request itself is wrong — a bad token, a bad number.
        // Only 5xx and 429 are worth trying again.
        retryable: res.status >= 500 || res.status === 429,
      };
    }

    return { ok: true, body };
  } catch (err) {
    // AbortError is the timeout above; everything else here is a network
    // failure. Both are worth retrying.
    const name = err instanceof Error ? err.name : 'unknown';
    return {
      ok: false,
      error: name === 'AbortError' ? 'timeout' : 'network_error',
      retryable: true,
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
      if (!res.ok) return { ok: false, error: res.error, retryable: res.retryable };

      if (!isSuccess(res.body)) {
        // HTTP 200 with a failure in the body — the case that makes status
        // codes alone untrustworthy here.
        return {
          ok: false,
          error: errorFrom(res.body, 'send_failed'),
          retryable: false,
        };
      }

      // A send that succeeded without an id is still a send. Falling back to a
      // marker keeps the success path honest rather than inventing an id or
      // downgrading it to a failure.
      return { ok: true, providerMessageId: messageIdFrom(res.body) ?? 'unknown' };
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
