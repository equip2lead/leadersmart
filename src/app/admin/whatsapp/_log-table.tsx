'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage, WhatsAppSendStatus } from '@/lib/types';

// The log table. A client component only for the expandable failure detail —
// everything else is server-rendered and the filter lives in the URL.

export type LogRow = {
  id: string;
  createdAt: string;
  /** The volunteer's name, or null when the row outlived them. */
  recipientName: string | null;
  phone: string;
  purpose: string;
  status: WhatsAppSendStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  messagePreview: string | null;
  /** Provider body, failures only. Credentials are stripped at the adapter. */
  rawResponse: unknown;
};

function purposeLabel(purpose: string, lang: AppLanguage): string {
  const key = `whatsapp.log.purpose_${purpose}`;
  const translated = t(key, lang);
  // An unrecognised purpose renders as its own key rather than vanishing —
  // new send types will appear here before anyone writes a label for them.
  return translated === key ? purpose : translated;
}

function formatWhen(iso: string, lang: AppLanguage): string {
  return new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LogTable({ lang, rows }: { lang: AppLanguage; rows: LogRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">
              {t('whatsapp.log.col_when', lang)}
            </th>
            <th className="px-4 py-3 font-semibold">
              {t('whatsapp.log.col_to', lang)}
            </th>
            <th className="px-4 py-3 font-semibold">
              {t('whatsapp.log.col_purpose', lang)}
            </th>
            <th className="px-4 py-3 font-semibold">
              {t('whatsapp.log.col_status', lang)}
            </th>
            <th className="px-4 py-3 font-semibold">
              {t('whatsapp.log.col_reference', lang)}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const open = openId === r.id;
            // Only failures carry a body worth opening — successes store none.
            const expandable = r.status === 'failed' && !!r.rawResponse;
            return (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {formatWhen(r.createdAt, lang)}
                </td>

                <td className="px-4 py-3">
                  {r.recipientName ? (
                    <p className="font-medium text-ink">{r.recipientName}</p>
                  ) : r.purpose === 'test' ? (
                    // A test send is addressed to a number, not a person, so
                    // it never had a volunteer to lose. Labelling it "removed"
                    // would invent a deletion that never happened.
                    <p className="text-xs italic text-muted">
                      {t('whatsapp.log.purpose_test', lang)}
                    </p>
                  ) : (
                    // Here the null does mean something: the FK is ON DELETE
                    // SET NULL, so a purged volunteer leaves the send behind.
                    // The number is the only identity left — and it is the one
                    // that actually received the message.
                    <p className="text-xs italic text-muted">
                      {t('whatsapp.log.deleted_volunteer', lang)}
                    </p>
                  )}
                  <p className="font-mono text-xs text-muted">{r.phone}</p>
                </td>

                <td className="px-4 py-3 text-xs text-body">
                  {purposeLabel(r.purpose, lang)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={
                      'whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ' +
                      (r.status === 'sent'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700')
                    }
                  >
                    {t(`whatsapp.log.status_${r.status}`, lang)}
                  </span>

                  {/* On a success this column holds the no-message-id warning;
                      on a failure, the provider's reason. Both belong beside
                      the status they qualify. */}
                  {r.errorMessage && (
                    <p className="mt-1 max-w-[16rem] text-xs text-body">
                      {r.errorMessage}
                    </p>
                  )}

                  {expandable && (
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : r.id)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-royal-700 hover:underline"
                    >
                      {open ? (
                        <ChevronDown className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      )}
                      {t(
                        open ? 'whatsapp.log.hide_details' : 'whatsapp.log.show_details',
                        lang,
                      )}
                    </button>
                  )}

                  {open && (
                    <pre className="mt-2 max-w-[28rem] overflow-x-auto rounded-lg bg-gray-50 p-2 text-[10px] leading-relaxed text-body">
                      {JSON.stringify(r.rawResponse, null, 2)}
                    </pre>
                  )}
                </td>

                <td className="px-4 py-3">
                  {r.providerMessageId ? (
                    <span className="font-mono text-xs text-body">
                      {r.providerMessageId}
                    </span>
                  ) : (
                    <span className="text-xs italic text-muted">
                      {t('whatsapp.log.no_reference', lang)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
