import { getMe } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { ensureProgress } from '../_progress-lib';
import { ProgressSidebar } from '../_progress-sidebar';
import { Step4Form, type PastorOption } from './_form';

export const dynamic = 'force-dynamic';

export default async function Step4Page() {
  const me = await getMe();
  const lang = me.user.preferred_language;
  const progress = await ensureProgress(me);
  const supabase = await createClient();

  // Eligible pool: the owner themselves plus any admin_pastor (or the
  // legacy 'pastor' role) already in this church. Invited admins won't
  // appear until they've accepted their invite.
  const { data: rows } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('church_id', me.church.id)
    .eq('is_active', true)
    .in('role', ['owner', 'admin_pastor', 'pastor'])
    .order('full_name');

  const pastors: PastorOption[] = (rows ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    isSelf: r.id === me.user.id,
  }));

  const hasOtherAdmins = pastors.some((p) => !p.isSelf);

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-[280px_1fr]">
      <ProgressSidebar currentStep={4} progress={progress} lang={lang} />
      <div className="px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {t('onboarding.step4.title', lang)}
        </h1>
        <p className="mt-2 text-sm text-body">
          {t('onboarding.step4.subtitle', lang)}
        </p>
        <div className="mt-8">
          <Step4Form
            lang={lang}
            pastors={pastors}
            hasOtherAdmins={hasOtherAdmins}
          />
        </div>
      </div>
    </div>
  );
}
