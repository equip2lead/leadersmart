import { AlertCircle } from 'lucide-react';
import { getMe } from '@/lib/auth';
import { isAdmin } from '@/lib/roles';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { getVocab } from '@/lib/vocabulary';
import { ROTATION_DISABLED_NOTICE, canToggleRotation, canUseRotation } from '@/lib/rotation';
import { createClient } from '@/lib/supabase/server';
import { ChurchProfileForm } from './_church-form';
import { ModulesForm } from './_modules-form';
import { RotationOptIn } from './_rotation-optin';
import { UserProfileForm } from './_user-form';
import { PasswordForm } from './_password-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;
  const { user, church, authEmail } = await getMe();
  const lang = user.preferred_language;
  const canEditChurch = isAdmin(user.role);
  // Owner + admin_pastor only, and churches only. A ministry never sees the
  // section at all — the module is not theirs to enable.
  const showModules = canEditChurch && canToggleRotation(church);

  // Anyone in an opted-in church can join the rotation — it is not an admin
  // action. Their existing volunteer row, if any, decides whether the section
  // offers the form or their personal link.
  const showOptIn = canUseRotation(church);
  let volunteerToken: string | null = null;
  if (showOptIn) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('volunteers')
      .select('personal_url_token')
      .eq('church_id', church.id)
      .eq('user_id', user.id)
      .maybeSingle();
    volunteerToken = (data?.personal_url_token as string | undefined) ?? null;
  }

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={t('nav.settings', lang)} subtitle={church.name} />

      {/* Stands in for a toast: this app has no toast system, and a banner
          survives the reload that brought the visitor here, which a toast
          fired before the redirect would not. */}
      {params.notice === ROTATION_DISABLED_NOTICE && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-lg border border-gold-warm-200 bg-gold-warm-50 px-4 py-3 text-sm text-ink"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-warm-700" aria-hidden="true" />
          {t('rotation.disabled_toast', lang)}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canEditChurch && (
          <section className="card">
            <h2 className="text-lg font-semibold text-ink">
              {getVocab(church.organization_type, lang).orgProfileTitle}
            </h2>
            <ChurchProfileForm
              churchId={church.id}
              initial={{
                name: church.name,
                country: church.country ?? '',
                city: church.city ?? '',
                language: church.language,
                timezone: church.timezone,
                currency: church.currency,
              }}
            />
          </section>
        )}

        {showModules && (
          <section className="card">
            <h2 className="text-lg font-semibold text-ink">
              {t('settings.optional_modules.section_title', lang)}
            </h2>
            <ModulesForm
              lang={lang}
              initialRotationEnabled={church.rotation_enabled}
            />
          </section>
        )}

        {showOptIn && (
          <section className="card">
            <h2 className="text-lg font-semibold text-ink">
              {t('rotation.optin.section_title', lang)}
            </h2>
            <RotationOptIn lang={lang} existingToken={volunteerToken} />
          </section>
        )}

        <section className="card">
          <h2 className="text-lg font-semibold text-ink">Your profile</h2>
          <UserProfileForm
            userId={user.id}
            initial={{
              full_name: user.full_name,
              phone: user.phone ?? '',
              preferred_language: user.preferred_language,
              email: authEmail ?? user.email,
            }}
          />
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-ink">Change password</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
