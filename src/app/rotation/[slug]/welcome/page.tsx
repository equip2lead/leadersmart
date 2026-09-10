import { notFound } from 'next/navigation';
import { PartyPopper } from 'lucide-react';
import { t } from '@/lib/i18n';
import { churchBySlug, volunteerByToken } from '@/lib/rotation-signup';
import { Wordmark } from '@/components/wordmark';
import { PersonalLinkCard } from './_link-card';

export const dynamic = 'force-dynamic';

export default async function RotationWelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ slug }, { token }] = await Promise.all([params, searchParams]);

  const lookup = await churchBySlug(slug);
  if (!lookup.ok) notFound();
  if (!token) notFound();

  const found = await volunteerByToken(token);
  // The token must belong to a volunteer of *this* church. Without that check
  // a valid token from another church would render under this church's name,
  // which is a small leak but a real one.
  if (!found || found.volunteer.church_id !== lookup.churchId) notFound();

  const lang = lookup.church.language;

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <Wordmark size="sm" />
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <PartyPopper className="h-6 w-6 text-emerald-600" aria-hidden="true" />
        </span>

        <h1 className="mt-4 font-manrope text-2xl font-bold tracking-tight text-ink">
          {t('rotation.welcome.title', lang)}
        </h1>
        <p className="mt-2 text-sm text-body">
          {t('rotation.welcome.body', lang).replace(
            '{name}',
            found.volunteer.full_name,
          )}
        </p>

        <div className="mt-6">
          <PersonalLinkCard lang={lang} path={`/me/${token}`} />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          {t('rotation.welcome.whatsapp_note', lang)}
        </p>
      </div>
    </main>
  );
}
