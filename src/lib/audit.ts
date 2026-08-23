import { createClient } from '@/lib/supabase/server';

export type AuditAction = 'create' | 'update' | 'deactivate' | 'reactivate' | 'invite';

export type AuditParams = {
  churchId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
};

// Best-effort audit log write. Never throws — a failed audit insert should not
// abort the surrounding mutation, since the mutation itself has already
// completed by the time we log.
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('audit_log').insert({
      church_id: params.churchId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      before_value: (params.beforeValue as object | null) ?? null,
      after_value: (params.afterValue as object | null) ?? null,
    });
  } catch {
    // swallow — audit failures shouldn't block user-facing writes
  }
}
