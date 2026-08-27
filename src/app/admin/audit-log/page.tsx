import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { AuditFilters, type ActorOption } from './_filters';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  before_value: unknown;
  after_value: unknown;
  created_at: string;
};

// Format a JSONB payload for the table. Objects compress to
// "key: value, key: value"; primitives and arrays fall back to
// JSON.stringify. Truncated to keep rows scannable.
function summarise(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object' && !Array.isArray(v)) {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return '—';
    const s = entries
      .map(([k, val]) => `${k}: ${typeof val === 'string' ? val : JSON.stringify(val)}`)
      .join(', ');
    return s.length > 90 ? `${s.slice(0, 90)}…` : s;
  }
  const s = JSON.stringify(v);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { user, church } = await requireRole(OWNER_ROLES);
  const lang = user.preferred_language;
  const supabase = await createClient();

  const filterAction = (params.action ?? '').trim();
  const filterActor = (params.actor ?? '').trim();
  const pageNum = Math.max(1, Number(params.page ?? '1') || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Base query: newest first, scoped by church (RLS enforces the same,
  // this is a belt-and-suspenders WHERE + explicit index hit).
  let q = supabase
    .from('audit_log')
    .select('id, action, entity_type, entity_id, user_id, before_value, after_value, created_at', {
      count: 'exact',
    })
    .eq('church_id', church.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filterAction) q = q.eq('action', filterAction);
  if (filterActor) q = q.eq('user_id', filterActor);

  const { data: rows, count } = await q;
  const total = count ?? 0;
  const auditRows = (rows ?? []) as AuditRow[];

  // Grab distinct action values + church actors in one shot for the
  // filter dropdowns. Kept simple; if audit_log grows large we can add
  // a materialised list later.
  const [actionsRes, actorsRes] = await Promise.all([
    supabase
      .from('audit_log')
      .select('action')
      .eq('church_id', church.id)
      .limit(500),
    supabase
      .from('users')
      .select('id, full_name')
      .eq('church_id', church.id)
      .order('full_name'),
  ]);

  const actionOptions = Array.from(
    new Set((actionsRes.data ?? []).map((r) => r.action)),
  ).sort();
  const actorOptions: ActorOption[] = (actorsRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.full_name,
  }));
  const actorNameById: Record<string, string> = {};
  for (const a of actorOptions) actorNameById[a.id] = a.name;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const preserveFilters = (target: number) => {
    const sp = new URLSearchParams();
    if (filterAction) sp.set('action', filterAction);
    if (filterActor) sp.set('actor', filterActor);
    if (target > 1) sp.set('page', String(target));
    const qs = sp.toString();
    return qs ? `/admin/audit-log?${qs}` : '/admin/audit-log';
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('audit.title', lang)}
        subtitle={t('audit.subtitle', lang)}
      />

      <div className="mt-6 card">
        <AuditFilters
          currentAction={filterAction}
          currentActor={filterActor}
          actionOptions={actionOptions}
          actorOptions={actorOptions}
          lang={lang}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {auditRows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">
            {filterAction || filterActor
              ? t('audit.emptyFiltered', lang)
              : t('audit.emptyAll', lang)}
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{t('audit.col.when', lang)}</th>
                <th className="px-4 py-3">{t('audit.col.action', lang)}</th>
                <th className="px-4 py-3">{t('audit.col.entity', lang)}</th>
                <th className="px-4 py-3">{t('audit.col.actor', lang)}</th>
                <th className="px-4 py-3">{t('audit.col.change', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditRows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    <span className="inline-flex items-center rounded-full bg-indigo-royal-50 px-2 py-0.5 text-xs font-medium text-indigo-royal-700">
                      {t(`audit.action.${r.action}`, lang)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    <span className="font-mono text-xs">
                      {t(`audit.entity.${r.entity_type}`, lang)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-body">
                    {r.user_id
                      ? (actorNameById[r.user_id] ?? t('audit.actorUnknown', lang))
                      : t('audit.actorSystem', lang)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <div className="space-y-1">
                      {r.before_value !== null && (
                        <p>
                          <span className="text-red-600">−</span>{' '}
                          <span className="font-mono">{summarise(r.before_value)}</span>
                        </p>
                      )}
                      {r.after_value !== null && (
                        <p>
                          <span className="text-emerald-600">+</span>{' '}
                          <span className="font-mono">{summarise(r.after_value)}</span>
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted">
            {t('audit.pageOf', lang)
              .replace('{page}', String(pageNum))
              .replace('{total}', String(totalPages))}
            {' · '}
            {t('audit.totalRows', lang).replace('{count}', String(total))}
          </p>
          <div className="flex gap-2">
            {pageNum > 1 ? (
              <Link href={preserveFilters(pageNum - 1)} className="btn-secondary">
                {t('audit.prev', lang)}
              </Link>
            ) : (
              <span className="btn-secondary opacity-40">{t('audit.prev', lang)}</span>
            )}
            {pageNum < totalPages ? (
              <Link href={preserveFilters(pageNum + 1)} className="btn-secondary">
                {t('audit.next', lang)}
              </Link>
            ) : (
              <span className="btn-secondary opacity-40">{t('audit.next', lang)}</span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
