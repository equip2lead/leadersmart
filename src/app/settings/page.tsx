import { getMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { PageHeading } from '@/components/page-heading';
import { ChurchProfileForm } from './_church-form';
import { UserProfileForm } from './_user-form';
import { PasswordForm } from './_password-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { user, church, authEmail } = await getMe();
  const lang = user.preferred_language;
  const canEditChurch = user.role === 'senior_pastor' || user.role === 'admin';

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8">
      <PageHeading title={t('nav.settings', lang)} subtitle={church.name} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canEditChurch && (
          <section className="card">
            <h2 className="text-lg font-semibold text-ink">Church profile</h2>
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
