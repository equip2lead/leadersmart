import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { canReviewAssignments } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import type { WhatsAppSendLog, WhatsAppSendStatus } from '@/lib/types';
import { LogTable, type LogRow } from './_log-table';

export const dynamic = 'force-dynamic';

/** Enough to answer "did last Sunday's messages go out"; not an archive. */
const PAGE_SIZE = 100;

type Filter = 'all' | WhatsAppSendStatus;
const FILTERS: Filter[] = ['all', 'sent', 'failed'];

export default async function WhatsAppLogPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const { user, church } = await getMe();
  // Matches the table's own RLS — SELECT is has_admin_rights(), so owner and
  // admin_pastor both read it. Deliberately wider than the credentials in
  // Settings, which are owner-only: seeing whether a message landed is not the
  // same trust as holding the token that sent it.
  if (!canReviewAssignments(user.role)) redirect('/admin');

  const lang = user.preferred_language;
  const filter: Filter = FILTERS.includes(params.filter as Filter)
    ? (params.filter as Filter)
    : 'all';

  const supabase = await createClient();

  let query = supabase
    .from('whatsapp_send_log')
    .select('*')
    .eq('church_id', church.id);
  if (filter !== 'all') query = query.eq('status', filter);

  const [logRes, configRes, totalRes] = await Promise.all([
    query.order('created_at', { ascending: false }).limit(PAGE_SIZE),
    supabase
      .from('church_whatsapp_config')
      .select('church_id')
      .eq('church_id', church.id)
      .maybeSingle(),
    // Counted unfiltered so the "untracked" note reflects the whole log rather
    // than whatever tab happens to be open.
    supabase
      .from('whatsapp_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('church_id', church.id)
      .eq('status', 'sent')
      .is('provider_message_id', null),
  ]);

  const entries = (logRes.data ?? []) as WhatsAppSendLog[];
  const configured = !!configRes.data;
  const untracked = totalRes.count ?? 0;

  // Resolve names for the volunteers that still exist. A row whose volunteer
  // was purged keeps its phone number and nothing else — the FK is ON DELETE
  // SET NULL precisely so the send survives the person.
  const volunteerIds = [
    ...new Set(entries.map((e) => e.volunteer_id).filter(Boolean)),
  ] as string[];
  const { data: volRows } = volunteerIds.length
    ? await supabase.from('volunteers').select('id, full_name').in('id', volunteerIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const nameById = new Map(
    (volRows ?? []).map((v) => [v.id as string, v.full_name as string]),
  );

  const rows: LogRow[] = entries.map((e) => ({
    id: e.id,
    createdAt: e.created_at,
    recipientName: e.volunteer_id ? (nameById.get(e.volunteer_id) ?? null) : null,
    phone: e.phone,
    purpose: e.purpose,
    status: e.status,
    providerMessageId: e.provider_message_id,
    errorMessage: e.error_message,
    messagePreview: e.message_preview,
    rawResponse: e.raw_response,
  }));

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('whatsapp.log.page_title', lang)}
        subtitle={t('whatsapp.log.subtitle', lang)}
      />

      {!configured && (
        <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-body">
          {t('whatsapp.log.not_configured', lang)}
        </p>
      )}

      {/* The one number worth watching: a send the gateway accepted without
          naming a message cannot be chased up later. */}
      {untracked > 0 && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-gold-warm-200 bg-gold-warm-50 px-4 py-3 text-sm text-ink">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-gold-warm-700"
            aria-hidden="true"
          />
          {t('whatsapp.log.untracked_note', lang).replace('{count}', String(untracked))}
        </p>
      )}

      <nav className="mt-6 flex flex-wrap gap-1 border-b border-gray-200">
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <Link
              key={f}
              href={`/admin/whatsapp?filter=${f}`}
              aria-current={active ? 'page' : undefined}
              className={
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ' +
                (active
                  ? 'border-indigo-royal-700 text-indigo-royal-700'
                  : 'border-transparent text-muted hover:text-ink')
              }
            >
              {t(`whatsapp.log.filter_${f}`, lang)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
            {filter === 'all' ? (
              <>
                <p className="mt-3 text-sm font-semibold text-ink">
                  {t('whatsapp.log.empty_title', lang)}
                </p>
                <p className="mt-1 text-sm text-body">
                  {t('whatsapp.log.empty_body', lang)}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-body">
                {t('whatsapp.log.empty_filtered', lang)}
              </p>
            )}
          </div>
        ) : (
          <>
            <LogTable lang={lang} rows={rows} />
            {rows.length === PAGE_SIZE && (
              <p className="mt-3 text-xs text-muted">
                {t('whatsapp.log.showing', lang).replace('{count}', String(PAGE_SIZE))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
