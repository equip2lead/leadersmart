import { Check, CheckCircle, Lock } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Two alternating feature showcases. Each mockup sits on a flat brand
// panel — yellow for the Sunday Checklist, sage for Peer Evaluation —
// so the two blocks are told apart by colour before a word is read.
// TODO: swap both placeholder mockups for real product screenshots.

export function ShowcaseSundayChecklist({ lang }: { lang: AppLanguage }) {
  const bullets = [
    'landing.showcase.a.bullet1',
    'landing.showcase.a.bullet2',
    'landing.showcase.a.bullet3',
    'landing.showcase.a.bullet4',
  ];
  return (
    <section className="bg-[#F9F4E7] py-24 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
            {t('landing.showcase.a.eyebrow', lang)}
          </p>
          <h2 className="font-manrope mt-3 text-3xl font-black leading-[1.12] tracking-[-0.02em] text-[#1A1E3F] sm:text-4xl lg:text-5xl">
            {t('landing.showcase.a.title', lang)}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#3D4470] sm:text-lg">
            {t('landing.showcase.a.body', lang)}
          </p>
          <ul className="mt-7 space-y-3">
            {bullets.map((k) => (
              <li key={k} className="flex items-start gap-3 text-[15px] text-[#1A1E3F]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFCB4A]">
                  <Check className="h-3 w-3 text-[#1A1E3F]" aria-hidden="true" />
                </span>
                {t(k, lang)}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-3xl bg-[#EFCB4A] p-6 sm:p-10"
          role="img"
          aria-label={t('landing.showcase.a.mockAlt', lang)}
        >
          <ChecklistMock lang={lang} />
        </div>
      </div>
    </section>
  );
}

export function ShowcasePeerEvaluation({ lang }: { lang: AppLanguage }) {
  const bullets = [
    'landing.showcase.b.bullet1',
    'landing.showcase.b.bullet2',
    'landing.showcase.b.bullet3',
    'landing.showcase.b.bullet4',
  ];
  return (
    <section className="bg-[#FDFCF7] py-24 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        {/* Mockup first on desktop so the two blocks mirror each other;
            copy still leads on mobile, where a lone mockup has no
            context yet. */}
        <div
          className="rounded-3xl bg-[#A8C79A] p-6 sm:p-10 lg:order-first"
          role="img"
          aria-label={t('landing.showcase.b.mockAlt', lang)}
        >
          <EvaluationMock lang={lang} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D4470]">
            {t('landing.showcase.b.eyebrow', lang)}
          </p>
          <h2 className="font-manrope mt-3 text-3xl font-black leading-[1.12] tracking-[-0.02em] text-[#1A1E3F] sm:text-4xl lg:text-5xl">
            {t('landing.showcase.b.title', lang)}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#3D4470] sm:text-lg">
            {t('landing.showcase.b.body', lang)}
          </p>
          <ul className="mt-7 space-y-3">
            {bullets.map((k) => (
              <li key={k} className="flex items-start gap-3 text-[15px] text-[#1A1E3F]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A8C79A]">
                  <Check className="h-3 w-3 text-[#1A1E3F]" aria-hidden="true" />
                </span>
                {t(k, lang)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ChecklistMock({ lang }: { lang: AppLanguage }) {
  const rows = [
    { key: 'landing.showcase.a.bullet1', done: true },
    { key: 'landing.showcase.a.bullet2', done: true },
    { key: 'landing.showcase.a.bullet3', done: false },
  ];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-xl shadow-[#1A1E3F]/10">
      <div className="flex items-center justify-between">
        <p className="font-manrope text-sm font-extrabold tracking-tight text-[#1A1E3F]">
          {t('landing.hero.mock.checklist', lang)}
        </p>
        <span className="rounded-full bg-[#D8E5D0] px-2.5 py-0.5 text-[10px] font-semibold text-[#1A1E3F]">
          12/17
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#FBF3D0]">
        <div className="h-full w-[70%] rounded-full bg-[#EFCB4A]" />
      </div>
      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2.5 text-xs text-[#3D4470]">
            <CheckCircle
              className={`h-4 w-4 shrink-0 ${r.done ? 'text-[#10B981]' : 'text-[#1A1E3F]/20'}`}
              aria-hidden="true"
            />
            <span className={r.done ? 'text-[#1A1E3F]' : ''}>{t(r.key, lang)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvaluationMock({ lang }: { lang: AppLanguage }) {
  // Filled-pip rows stand in for the eight criteria scores; the last row
  // is locked to show the "private until signed" rule visually.
  const rows = [4, 5, 3];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-xl shadow-[#1A1E3F]/10">
      <div className="flex items-center justify-between">
        <p className="font-manrope text-sm font-extrabold tracking-tight text-[#1A1E3F]">
          {t('landing.feature.eval.title', lang)}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FBF3D0] px-2.5 py-0.5 text-[10px] font-semibold text-[#1A1E3F]">
          <Lock className="h-2.5 w-2.5" aria-hidden="true" />
          {t('landing.showcase.b.bullet3', lang)}
        </span>
      </div>
      <ul className="mt-5 space-y-4">
        {rows.map((score, i) => (
          <li key={i}>
            <div className="h-1.5 w-24 rounded-full bg-[#1A1E3F]/10" />
            <div className="mt-2 flex gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((pip) => (
                <span
                  key={pip}
                  className={`h-2.5 w-2.5 rounded-full ${
                    pip <= score ? 'bg-[#1A1E3F]' : 'bg-[#1A1E3F]/15'
                  }`}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-[#1A1E3F]/10 pt-4 text-[11px] font-semibold text-[#3D4470]">
        {t('landing.showcase.b.bullet4', lang)}
      </p>
    </div>
  );
}
