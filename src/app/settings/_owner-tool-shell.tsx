import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';
import { PageHeading } from '@/components/page-heading';

// Shared shell for the three Phase 3 Owner Tools stubs (Billing, Transfer
// Ownership, Danger Zone). Keeps their look consistent and puts the
// "Coming soon" affordance in exactly one place.
export function OwnerToolShell({
  titleKey,
  subtitleKey,
  bodyKey,
  icon: Icon,
  lang,
}: {
  titleKey: string;
  subtitleKey: string;
  bodyKey: string;
  icon: LucideIcon;
  lang: AppLanguage;
}) {
  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={t(titleKey, lang)} subtitle={t(subtitleKey, lang)} />

      <div className="mt-6 card flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-royal-50 text-indigo-royal-700">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink">
          {t('nav.owner.comingSoon', lang)}
        </p>
        <p className="mt-2 max-w-md text-sm text-body">{t(bodyKey, lang)}</p>
        <Link
          href="/settings"
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-indigo-royal-700 hover:bg-indigo-royal-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back', lang)}
        </Link>
      </div>
    </div>
  );
}
