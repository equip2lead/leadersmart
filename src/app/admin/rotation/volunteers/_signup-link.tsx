'use client';

import { useState } from 'react';
import { Check, Copy, LinkIcon } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// The public sign-up URL for this church, ready to paste into a WhatsApp
// group or print on a slide.
//
// Built in the browser rather than on the server for the same reason as the
// volunteer's personal link: the server's idea of its own host is routinely
// wrong behind a proxy or on a preview deployment, and a shared link that
// points at the wrong origin is worse than no link.

export function SignupLink({ lang, path }: { lang: AppLanguage; path: string }) {
  const [copied, setCopied] = useState(false);
  const href =
    typeof window === 'undefined' ? path : `${window.location.origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Refused on insecure origins and in some browsers. The URL is shown in
      // full, so the cost is a manual selection.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <LinkIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('rotation.admin.volunteers.signup_link_label', lang)}
        </p>
        <p className="mt-0.5 break-all font-mono text-xs text-ink">{href}</p>
      </div>
      <button type="button" onClick={copy} className="btn-secondary !py-1.5">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied
          ? t('rotation.welcome.copied', lang)
          : t('rotation.welcome.copy_url', lang)}
      </button>
    </div>
  );
}
