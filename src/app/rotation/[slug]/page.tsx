import { notFound } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { t } from '@/lib/i18n';
import { churchBySlug, signupStations } from '@/lib/rotation-signup';
import { Wordmark } from '@/components/wordmark';
import { SignupForm } from './_signup-form';

export const dynamic = 'force-dynamic';

export default async function RotationSignupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lookup = await churchBySlug(slug);

  // A ministry, or a slug that matches nothing, is 404 — the two are
  // indistinguishable on purpose, so a stranger cannot enumerate which
  // churches exist by watching which URLs answer differently.
  if (!lookup.ok && lookup.reason === 'not_found') notFound();

  // The visitor is not signed in and has no profile, so the page speaks the
  // church's own language rather than a user preference.
  const lang = lookup.ok ? lookup.church.language : 'en';

  if (!lookup.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
          <h1 className="mt-4 font-manrope text-xl font-bold text-ink">
            {t('rotation.signup.not_accepting_title', lang)}
          </h1>
          <p className="mt-2 text-sm text-body">
            {t('rotation.signup.not_accepting_body', lang)}
          </p>
        </div>
      </main>
    );
  }

  const stations = await signupStations(lookup.churchId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <Wordmark size="sm" />
        <h1 className="mt-6 font-manrope text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t('rotation.signup.title', lang)}
        </h1>
        <p className="mt-1 text-sm font-semibold text-indigo-royal-700">
          {lookup.church.name}
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-body">
          {t('rotation.signup.description', lang)}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
        <SignupForm
          lang={lang}
          slug={slug}
          stations={stations.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </main>
  );
}
