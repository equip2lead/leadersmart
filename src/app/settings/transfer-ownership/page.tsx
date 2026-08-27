import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, Mail, ShieldAlert } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { OWNER_ROLES } from '@/lib/roles';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';

export const dynamic = 'force-dynamic';

// Deliberately a static informational page. Ownership transfer is a
// support-driven manual process (matches Planning Center / Breeze /
// Tithe.ly / CCB / Subsplash). Self-serve token flows are out of scope
// — see the Phase 3 course-correction.
export default async function TransferOwnershipPage() {
  const { user, church } = await requireRole(OWNER_ROLES);
  const lang = user.preferred_language;

  const supportEmail = 'support@leadersmart.app';
  const subject = encodeURIComponent(
    t('owner.transfer.mailto.subject', lang).replace('{church}', church.name),
  );
  const mailto = `mailto:${supportEmail}?subject=${subject}`;

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading
        title={t('owner.transfer.title', lang)}
        subtitle={t('owner.transfer.subtitle', lang)}
      />

      <div className="mt-6 grid gap-4">
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-royal-50 text-indigo-royal-700">
              <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-ink">
                {t('owner.transfer.how.title', lang)}
              </h2>
              <p className="mt-2 text-sm text-body">
                {t('owner.transfer.how.body', lang)}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-body">
                <li>{t('owner.transfer.how.item1', lang)}</li>
                <li>{t('owner.transfer.how.item2', lang)}</li>
                <li>{t('owner.transfer.how.item3', lang)}</li>
                <li>{t('owner.transfer.how.item4', lang)}</li>
                <li>{t('owner.transfer.how.item5', lang)}</li>
              </ul>
              <p className="mt-3 text-sm text-body">
                {t('owner.transfer.how.sla', lang)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-ink">
                {t('owner.transfer.emergency.title', lang)}
              </h2>
              <p className="mt-2 text-sm text-body">
                {t('owner.transfer.emergency.body', lang)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <a
            href={mailto}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('owner.transfer.emailButton', lang).replace('{email}', supportEmail)}
          </a>
          <p className="mt-3 text-xs text-muted">
            {t('owner.transfer.emailHint', lang).replace('{email}', supportEmail)}
          </p>
        </div>

        <p className="text-xs">
          <Link href="/settings" className="text-indigo-royal-700 hover:underline">
            <ArrowLeft className="mr-1 inline h-3 w-3" />
            {t('common.back', lang)}
          </Link>
        </p>
      </div>
    </div>
  );
}
