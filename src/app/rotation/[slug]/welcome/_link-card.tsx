'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// The personal link, with a copy button.
//
// A client component for one reason: the absolute URL has to be built in the
// browser. Rendering it on the server would bake in whatever host the server
// thinks it is, which behind a proxy or on a preview deployment is routinely
// not the host the volunteer is looking at — and this is the one link they
// cannot recover if it is wrong.

export function PersonalLinkCard({
  lang,
  path,
}: {
  lang: AppLanguage;
  path: string;
}) {
  const [copied, setCopied] = useState(false);
  const href =
    typeof window === 'undefined' ? path : `${window.location.origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused in some browsers and on insecure origins.
      // The URL is displayed in full above, so a failed copy costs the
      // volunteer a manual selection, not the link.
    }
  }

  return (
    <div className="rounded-xl border border-indigo-royal-200 bg-indigo-royal-50 p-5 text-left">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-royal-700">
        {t('rotation.welcome.bookmark_prompt', lang)}
      </p>

      <p className="mt-2 break-all rounded-lg border border-indigo-royal-200 bg-white px-3 py-2 font-mono text-xs text-ink">
        {href}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-secondary !py-2">
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied
            ? t('rotation.welcome.copied', lang)
            : t('rotation.welcome.copy_url', lang)}
        </button>
        <a href={path} className="btn-primary !py-2">
          {t('rotation.welcome.open_link', lang)}
        </a>
      </div>
    </div>
  );
}
