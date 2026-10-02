'use server';

import { revalidatePath } from 'next/cache';
import { getMe } from '@/lib/auth';
import { isOwner } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminKey } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export type PurgeResult =
  | { ok: true; total: number; tables: number; perTable: Record<string, number> }
  | { ok: false; error: string };

/**
 * Delete every fixture row in the caller's own tenant.
 *
 * Lives in Settings → Danger rather than on the Rotation volunteers page,
 * which is where the only previous purge control sat. That button is gated on
 * canUseRotation(), so a ministry could never reach it — and a ministry is
 * exactly the kind of tenant that gets seeded with branches, leaders and
 * reports and then needs them gone. A tenant-wide purge belongs on a
 * tenant-wide screen.
 *
 * The SQL function does the deleting and the owner check; this action repeats
 * the role check in front of it. Defence in depth, same as everywhere else:
 * an RLS or definer-function refusal arrives as an exception or zero rows,
 * which is a worse thing to render than a plain "not allowed".
 */
export async function purgeAllTestData(): Promise<PurgeResult> {
  const me = await getMe();
  if (!isOwner(me.user.role)) return { ok: false, error: 'not_owner' };

  const supabase = await createClient();

  // Collected before the purge: once the users rows are gone there is nothing
  // left pointing at the auth accounts behind them, and an orphaned auth.user
  // is invisible in the app but still occupies its email address.
  const { data: testUsers, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('church_id', me.church.id)
    .eq('is_test_data', true);
  if (lookupError) return { ok: false, error: lookupError.message };
  const authIds = (testUsers ?? []).map((u) => u.id as string);

  const { data, error } = await supabase.rpc('cleanup_test_data');
  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as Array<{ table_name: string; deleted_count: number }>;
  const perTable: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const n = Number(r.deleted_count);
    perTable[r.table_name] = n;
    total += n;
  }

  // Best-effort, and deliberately after the rows are gone. A missing service
  // key or a failed delete here leaves an unusable auth account behind, which
  // is untidy; refusing the whole purge over it would leave the fixture in
  // place, which is worse. Reported in the audit entry either way.
  const orphanedAuthUsers: string[] = [];
  if (authIds.length > 0 && hasAdminKey()) {
    const admin = createAdminClient();
    for (const id of authIds) {
      const { error: delError } = await admin.auth.admin.deleteUser(id);
      if (delError) orphanedAuthUsers.push(id);
    }
  } else if (authIds.length > 0) {
    orphanedAuthUsers.push(...authIds);
  }

  await logAudit({
    churchId: me.church.id,
    userId: me.user.id,
    action: 'update',
    entityType: 'church',
    entityId: me.church.id,
    afterValue: {
      purged_test_data: perTable,
      total_rows: total,
      auth_users_deleted: authIds.length - orphanedAuthUsers.length,
      auth_users_orphaned: orphanedAuthUsers,
    },
  });

  revalidatePath('/settings/danger');
  revalidatePath('/admin');
  revalidatePath('/admin/rotation/volunteers');

  return { ok: true, total, tables: rows.length, perTable };
}
