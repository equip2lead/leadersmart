import 'server-only';

import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { createWamatasProvider } from './wamatas';
import type { WhatsAppProvider, WhatsAppProviderName } from './provider';

// Provider selection, and the only place credentials are read.
//
// `server-only` is load-bearing: importing this file from a client component
// is a build error rather than a runtime leak of a church's access token into
// a browser bundle. Nothing else in src/lib/whatsapp/ reads the config table.
//
// The service-role client is used rather than the caller's session because
// sends happen on behalf of the church, not the person: a schedule published
// by an admin_pastor must still send, and the config SELECT policy is
// has_admin_rights(). Using the service role keeps that decision here, in one
// function, instead of spread across every caller's RLS context.

/** What the Settings page is allowed to know. Deliberately not the row: the
    token never leaves this module, and the page renders a masked hint that is
    computed server-side. */
export type WhatsAppConfigSummary = {
  provider: WhatsAppProviderName;
  isEnabled: boolean;
  /** Last 4 characters of the stored token, or null when none is set. Enough
      to confirm which credential is in place; useless to anyone who sees it. */
  tokenHint: string | null;
  instanceId: string | null;
  lastTestSentAt: string | null;
  lastTestStatus: string | null;
};

type ConfigRow = {
  provider: WhatsAppProviderName;
  is_enabled: boolean;
  wamatas_access_token: string | null;
  wamatas_instance_id: string | null;
  last_test_sent_at: string | null;
  last_test_status: string | null;
};

async function loadConfig(churchId: string): Promise<ConfigRow | null> {
  if (!hasAdminKey()) {
    console.error('[whatsapp] SUPABASE_SERVICE_ROLE_KEY is not set — sending disabled.');
    return null;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from('church_whatsapp_config')
    .select(
      'provider, is_enabled, wamatas_access_token, wamatas_instance_id, last_test_sent_at, last_test_status',
    )
    .eq('church_id', churchId)
    .maybeSingle();
  return (data as ConfigRow | null) ?? null;
}

/** Masked view for the UI. Safe to return from a server component. */
export async function getWhatsAppConfigSummary(
  churchId: string,
): Promise<WhatsAppConfigSummary | null> {
  const row = await loadConfig(churchId);
  if (!row) return null;

  const token = row.wamatas_access_token;
  return {
    provider: row.provider,
    isEnabled: row.is_enabled,
    // Masked on the server. The full value is never part of the payload that
    // crosses to the browser, so there is nothing in the page source to read.
    tokenHint: token && token.length >= 4 ? token.slice(-4) : token ? '••••' : null,
    instanceId: row.wamatas_instance_id,
    lastTestSentAt: row.last_test_sent_at,
    lastTestStatus: row.last_test_status,
  };
}

/**
 * A ready-to-use provider for this church, or null.
 *
 * Null covers every "cannot send" case — no config, not enabled, missing
 * credentials, a provider that is not built yet — because the caller's
 * response is the same in all of them: skip quietly. Publishing a rota must
 * not fail because a church never set up WhatsApp.
 *
 * `requireEnabled` is false only for the test send, which is precisely the
 * operation that has to run before is_enabled can ever become true.
 */
export async function getWhatsAppProvider(
  churchId: string,
  opts: { requireEnabled?: boolean } = {},
): Promise<WhatsAppProvider | null> {
  const requireEnabled = opts.requireEnabled ?? true;

  const row = await loadConfig(churchId);
  if (!row) return null;
  if (requireEnabled && !row.is_enabled) return null;

  if (row.provider === 'wamatas') {
    if (!row.wamatas_access_token || !row.wamatas_instance_id) return null;
    return createWamatasProvider({
      accessToken: row.wamatas_access_token,
      instanceId: row.wamatas_instance_id,
    });
  }

  // genuka and meta_cloud are accepted by the CHECK constraint so a church can
  // be migrated to them without a schema change, but neither adapter exists
  // yet. Returning null is the same "cannot send" the caller already handles.
  return null;
}
