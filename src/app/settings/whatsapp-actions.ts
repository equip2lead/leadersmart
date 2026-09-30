'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { isOwner } from '@/lib/roles';
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import { t } from '@/lib/i18n';
import { getWhatsAppProvider } from '@/lib/whatsapp/factory';
import { logWhatsAppSend } from '@/lib/whatsapp/log';
import { looksLikePhone, normalisePhone } from '@/lib/whatsapp/provider';
import type { WhatsAppProviderKey } from '@/lib/types';

// Settings actions for WhatsApp.
//
// Owner-only throughout, matching the RLS policies: an access token can send
// messages in the church's name to its whole volunteer list, and that is a
// narrower trust than "can administer".
//
// No action here ever returns a credential. The only thing that leaves this
// module is a result — saved, sent, or an error code the UI translates.

export type WhatsAppResult = { ok: true } | { ok: false; error: string };
export type TestResult =
  // providerMessageId is null when the provider accepted the send but named no
  // message. The test still succeeded — the toast simply has no reference to
  // quote, and says so rather than printing a placeholder.
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

const PROVIDERS: WhatsAppProviderKey[] = ['wamatas', 'genuka', 'meta_cloud'];

async function requireOwner() {
  const me = await getMe();
  if (!isOwner(me.user.role)) return { me: null as null, error: 'not_owner' as const };
  return { me, error: null };
}

/**
 * Save provider credentials.
 *
 * An empty access token means "keep what is stored", not "clear it". The form
 * never receives the saved token — it shows only the last four characters — so
 * submitting the form unchanged must not wipe the credential the user cannot
 * see to retype.
 */
export async function saveWhatsAppConfig(input: {
  provider: string;
  accessToken: string;
  instanceId: string;
}): Promise<WhatsAppResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  const provider = input.provider as WhatsAppProviderKey;
  if (!PROVIDERS.includes(provider)) {
    return { ok: false, error: 'provider_unavailable' };
  }
  // Only Wamatas has an adapter. Accepting the others into the column would
  // store a configuration that can never send.
  if (provider !== 'wamatas') {
    return { ok: false, error: 'provider_unavailable' };
  }

  const token = input.accessToken.trim();
  const instanceId = input.instanceId.trim();
  if (!instanceId) return { ok: false, error: 'missing_credentials' };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('church_whatsapp_config')
    .select('church_id, wamatas_access_token')
    .eq('church_id', me.church.id)
    .maybeSingle();

  const keepToken = !token && !!existing?.wamatas_access_token;
  if (!token && !keepToken) return { ok: false, error: 'missing_credentials' };

  const { error: upErr } = await supabase.from('church_whatsapp_config').upsert(
    {
      church_id: me.church.id,
      provider,
      wamatas_instance_id: instanceId,
      ...(keepToken ? {} : { wamatas_access_token: token }),
      updated_by: me.user.id,
    },
    { onConflict: 'church_id' },
  );
  if (upErr) return { ok: false, error: upErr.message };

  // The audit entry records that credentials changed, never what they are.
  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'whatsapp_config',
    entityId: me.church.id,
    afterValue: { provider, token_changed: !keepToken },
  });

  revalidatePath('/settings');
  return { ok: true };
}

/** Turn sending on or off. Enabling is refused until a test has succeeded —
    is_enabled is a statement that messages get through, not that a token has
    been typed. */
export async function setWhatsAppEnabled(enabled: boolean): Promise<WhatsAppResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  const supabase = await createClient();
  const { data: config } = await supabase
    .from('church_whatsapp_config')
    .select('last_test_status')
    .eq('church_id', me.church.id)
    .maybeSingle();
  if (!config) return { ok: false, error: 'not_configured' };
  if (enabled && config.last_test_status !== 'success') {
    return { ok: false, error: 'not_configured' };
  }

  const { error: upErr } = await supabase
    .from('church_whatsapp_config')
    .update({ is_enabled: enabled, updated_by: me.user.id })
    .eq('church_id', me.church.id);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath('/settings');
  return { ok: true };
}

/**
 * Send a test message, and record the outcome.
 *
 * This is the one send that runs with requireEnabled: false — it is precisely
 * the operation that has to succeed before is_enabled can become true.
 *
 * A success flips is_enabled on, so a church that tests successfully is
 * connected without a second step. A failure leaves it alone rather than
 * switching it off: an already-working integration should not be disabled by
 * one bad test to a mistyped number.
 */
export async function sendWhatsAppTest(phone: string): Promise<TestResult> {
  const { me, error } = await requireOwner();
  if (!me) return { ok: false, error };

  const to = normalisePhone(phone);
  if (!looksLikePhone(to)) return { ok: false, error: 'invalid_phone' };

  const provider = await getWhatsAppProvider(me.church.id, { requireEnabled: false });
  if (!provider) return { ok: false, error: 'not_configured' };

  const message = t('whatsapp.messages.test', me.church.language);
  const result = await provider.sendText({ to, message });

  await logWhatsAppSend({
    churchId: me.church.id,
    userId: me.user.id,
    purpose: 'test',
    phone: to,
    message,
    provider: provider.name,
    result,
  });

  // Written with the service role: last_test_* is a fact about the send, and
  // recording it should not depend on the caller's policy context.
  if (hasAdminKey()) {
    const admin = createAdminClient();
    await admin
      .from('church_whatsapp_config')
      .update({
        last_test_sent_at: new Date().toISOString(),
        last_test_status: result.ok ? 'success' : result.error,
        ...(result.ok ? { is_enabled: true } : {}),
      })
      .eq('church_id', me.church.id);
  }

  revalidatePath('/settings');
  return result.ok
    ? { ok: true, providerMessageId: result.providerMessageId }
    : { ok: false, error: result.error };
}
