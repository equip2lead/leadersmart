import { getMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { ensureProgress } from '../_progress-lib';
import { ProgressSidebar } from '../_progress-sidebar';
import { ChangeOrgType } from '../_change-org-type';
import { Step3Form } from './_form';

export const dynamic = 'force-dynamic';

// Suggestion lists. Localised via i18n at render time so we can also
// keep a stable EN slug for the audit trail (unused here but future-
// proofing). Churches get Sunday-shaped departments; ministries get
// programme-shaped teams. Both write to the same `departments` table —
// only the vocabulary differs.
const CHURCH_SUGGESTION_KEYS: string[] = [
  'onboarding.step3.suggest.ushering',
  'onboarding.step3.suggest.welcome',
  'onboarding.step3.suggest.children',
  'onboarding.step3.suggest.prayer',
  'onboarding.step3.suggest.media',
  'onboarding.step3.suggest.cleaning',
  'onboarding.step3.suggest.worship',
  'onboarding.step3.suggest.security',
];

const MINISTRY_SUGGESTION_KEYS: string[] = [
  'onboarding.step3.ministrySuggest.leadership',
  'onboarding.step3.ministrySuggest.programs',
  'onboarding.step3.ministrySuggest.communications',
  'onboarding.step3.ministrySuggest.volunteers',
  'onboarding.step3.ministrySuggest.operations',
  'onboarding.step3.ministrySuggest.outreach',
  'onboarding.step3.ministrySuggest.training',
  'onboarding.step3.ministrySuggest.finance',
];

export default async function Step3Page() {
  const me = await getMe();
  const lang = me.user.preferred_language;
  const progress = await ensureProgress(me);

  const orgType = me.church.organization_type;
  const isMinistry = orgType === 'ministry';

  const suggestions = (
    isMinistry ? MINISTRY_SUGGESTION_KEYS : CHURCH_SUGGESTION_KEYS
  ).map((k) => t(k, lang));

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-[280px_1fr]">
      <ProgressSidebar
        currentStep={3}
        progress={progress}
        lang={lang}
        orgType={orgType}
      />
      <div className="px-6 py-10 sm:px-10">
        <div className="mb-6">
          <ChangeOrgType lang={lang} />
        </div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          {t(
            isMinistry ? 'onboarding.step3.ministry.title' : 'onboarding.step3.title',
            lang,
          )}
        </h1>
        <p className="mt-2 text-sm text-body">
          {t(
            isMinistry
              ? 'onboarding.step3.ministry.subtitle'
              : 'onboarding.step3.subtitle',
            lang,
          )}
        </p>
        <div className="mt-8">
          <Step3Form lang={lang} suggestions={suggestions} orgType={orgType} />
        </div>
      </div>
    </div>
  );
}
