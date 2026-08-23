'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// Sunday Morning Checklist — 22 items across 3 phases and 7 sub-groups.
// The `id` values are the stable storage keys (persisted into
// sunday_checklists.items_checked JSONB). Never rename them, even if
// labels change — historical data queries depend on them.
const ITEMS: Array<{
  groupKey: string;
  subGroups: Array<{
    subKey: string;
    items: Array<{ id: string; labelKey: string }>;
  }>;
}> = [
  {
    groupKey: 'sunday.group.before',
    subGroups: [
      {
        subKey: 'sunday.sub.personnel',
        items: [
          {
            id: 'before_service.personnel.ministers_arrived_730',
            labelKey: 'sunday.item.before.personnel.ministers_arrived_730',
          },
          {
            id: 'before_service.personnel.activities_stopped_759',
            labelKey: 'sunday.item.before.personnel.activities_stopped_759',
          },
          {
            id: 'before_service.personnel.prayer_team_ready_800',
            labelKey: 'sunday.item.before.personnel.prayer_team_ready_800',
          },
          {
            id: 'before_service.personnel.worship_coordinators_present',
            labelKey: 'sunday.item.before.personnel.worship_coordinators_present',
          },
          {
            id: 'before_service.personnel.ushers_briefed',
            labelKey: 'sunday.item.before.personnel.ushers_briefed',
          },
        ],
      },
      {
        subKey: 'sunday.sub.spiritual',
        items: [
          {
            id: 'before_service.spiritual.altar_ministers_ready',
            labelKey: 'sunday.item.before.spiritual.altar_ministers_ready',
          },
          {
            id: 'before_service.spiritual.booklets_available',
            labelKey: 'sunday.item.before.spiritual.booklets_available',
          },
          {
            id: 'before_service.spiritual.communion_organized',
            labelKey: 'sunday.item.before.spiritual.communion_organized',
          },
        ],
      },
      {
        subKey: 'sunday.sub.deptReady',
        items: [
          {
            id: 'before_service.dept.children_teacher_present',
            labelKey: 'sunday.item.before.dept.children_teacher_present',
          },
          {
            id: 'before_service.dept.walkthrough_completed',
            labelKey: 'sunday.item.before.dept.walkthrough_completed',
          },
          {
            id: 'before_service.dept.service_list_confirmed',
            labelKey: 'sunday.item.before.dept.service_list_confirmed',
          },
        ],
      },
    ],
  },
  {
    groupKey: 'sunday.group.during',
    subGroups: [
      {
        subKey: 'sunday.sub.serviceFlow',
        items: [
          {
            id: 'during_service.flow.ushers_timing',
            labelKey: 'sunday.item.during.flow.ushers_timing',
          },
          {
            id: 'during_service.flow.prayer_protocol',
            labelKey: 'sunday.item.during.flow.prayer_protocol',
          },
          {
            id: 'during_service.flow.timing_respected',
            labelKey: 'sunday.item.during.flow.timing_respected',
          },
          {
            id: 'during_service.flow.first_at_altar',
            labelKey: 'sunday.item.during.flow.first_at_altar',
          },
        ],
      },
      {
        subKey: 'sunday.sub.altar',
        items: [
          {
            id: 'during_service.altar.everyone_prayed_for',
            labelKey: 'sunday.item.during.altar.everyone_prayed_for',
          },
          {
            id: 'during_service.altar.booklet_to_converts',
            labelKey: 'sunday.item.during.altar.booklet_to_converts',
          },
        ],
      },
    ],
  },
  {
    groupKey: 'sunday.group.after',
    subGroups: [
      {
        subKey: 'sunday.sub.memberCare',
        items: [
          {
            id: 'after_service.care.new_visitors_welcomed',
            labelKey: 'sunday.item.after.care.new_visitors_welcomed',
          },
          {
            id: 'after_service.care.greeting_at_door',
            labelKey: 'sunday.item.after.care.greeting_at_door',
          },
          {
            id: 'after_service.care.visitor_info_collected',
            labelKey: 'sunday.item.after.care.visitor_info_collected',
          },
        ],
      },
      {
        subKey: 'sunday.sub.reporting',
        items: [
          {
            id: 'after_service.reporting.sunday_report_sent',
            labelKey: 'sunday.item.after.reporting.sunday_report_sent',
          },
          {
            id: 'after_service.reporting.senior_pastor_received',
            labelKey: 'sunday.item.after.reporting.senior_pastor_received',
          },
        ],
      },
    ],
  },
];

const TOTAL_ITEMS = ITEMS.reduce(
  (sum, g) => sum + g.subGroups.reduce((s, sg) => s + sg.items.length, 0),
  0,
);

type ChecklistProps = {
  assignmentId: string;
  existingId: string | null;
  initialItems: Record<string, boolean>;
  initialAttendance: number | null;
  initialOffering: number | null;
  initialVisitors: number | null;
  initialIssues: string;
  lang: AppLanguage;
};

export function ChecklistForm({
  assignmentId,
  existingId,
  initialItems,
  initialAttendance,
  initialOffering,
  initialVisitors,
  initialIssues,
  lang,
}: ChecklistProps) {
  const router = useRouter();
  const [items, setItems] = useState<Record<string, boolean>>(initialItems);
  const [attendance, setAttendance] = useState<string>(
    initialAttendance !== null ? String(initialAttendance) : '',
  );
  const [offering, setOffering] = useState<string>(
    initialOffering !== null ? String(initialOffering) : '',
  );
  const [visitors, setVisitors] = useState<string>(
    initialVisitors !== null ? String(initialVisitors) : '',
  );
  const [issues, setIssues] = useState(initialIssues);
  const [rowId, setRowId] = useState<string | null>(existingId);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDirty = useRef(false);

  async function persist(isDraft: boolean) {
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        pastor_assignment_id: assignmentId,
        service_date: new Date().toISOString().slice(0, 10),
        items_checked: items,
        attendance_count: attendance ? Number(attendance) : null,
        offering_total: offering ? Number(offering) : null,
        new_visitors_count: visitors ? Number(visitors) : null,
        issues_text: issues || null,
        is_draft: isDraft,
        submitted_at: isDraft ? null : new Date().toISOString(),
      };

      if (rowId) {
        const { error: updErr } = await supabase
          .from('sunday_checklists')
          .update(payload)
          .eq('id', rowId);
        if (updErr) {
          setError(updErr.message);
          return false;
        }
      } else {
        const { data, error: insErr } = await supabase
          .from('sunday_checklists')
          .insert(payload)
          .select('id')
          .single();
        if (insErr || !data) {
          setError(insErr?.message ?? 'Save failed');
          return false;
        }
        setRowId(data.id);
      }

      setLastSaved(new Date().toLocaleTimeString());
      isDirty.current = false;
      return true;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty.current && !saving) {
        void persist(true);
      }
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, attendance, offering, visitors, issues, rowId, saving]);

  function markDirty() {
    isDirty.current = true;
  }

  function toggle(id: string) {
    setItems((prev) => ({ ...prev, [id]: !prev[id] }));
    markDirty();
  }

  const checkedCount = Object.values(items).filter(Boolean).length;

  async function onSubmit() {
    setError(null);
    const ok = await persist(false);
    if (ok) {
      router.push('/pastor');
      router.refresh();
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-body">
              {t('sunday.progress', lang)}:{' '}
              <strong className="text-ink">
                {checkedCount}/{TOTAL_ITEMS}
              </strong>
            </p>
            {lastSaved && (
              <p className="text-xs text-muted">
                {t('sunday.savedAt', lang)} {lastSaved}
              </p>
            )}
          </div>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-brand-700 transition-all"
              style={{ width: `${Math.round((checkedCount / TOTAL_ITEMS) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {ITEMS.map((group) => (
        <div key={group.groupKey} className="card">
          <h3 className="text-base font-semibold text-ink">
            {t(group.groupKey, lang)}
          </h3>
          <div className="mt-4 space-y-5">
            {group.subGroups.map((sub) => (
              <div key={sub.subKey}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t(sub.subKey, lang)}
                </p>
                <ul className="mt-2 space-y-2">
                  {sub.items.map((item) => {
                    const checked = !!items[item.id];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 text-left text-sm transition hover:bg-gray-50"
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {checked && '✓'}
                          </span>
                          <span
                            className={checked ? 'text-muted line-through' : 'text-body'}
                          >
                            {t(item.labelKey, lang)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card space-y-4">
        <h3 className="text-base font-semibold text-ink">
          {t('sunday.serviceNumbers', lang)}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="att">
              {t('sunday.attendance', lang)}
            </label>
            <input
              id="att"
              type="number"
              min={0}
              className="input"
              value={attendance}
              onChange={(e) => {
                setAttendance(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="off">
              {t('sunday.offering', lang)}
            </label>
            <input
              id="off"
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={offering}
              onChange={(e) => {
                setOffering(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="vis">
              {t('sunday.visitors', lang)}
            </label>
            <input
              id="vis"
              type="number"
              min={0}
              className="input"
              value={visitors}
              onChange={(e) => {
                setVisitors(e.target.value);
                markDirty();
              }}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="iss">
            {t('sunday.issues', lang)}
          </label>
          <textarea
            id="iss"
            rows={3}
            className="input"
            value={issues}
            onChange={(e) => {
              setIssues(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => void persist(true)}
          disabled={saving}
          className="btn-secondary"
        >
          {t('sunday.saveDraft', lang)}
        </button>
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={saving}
          className="btn-primary"
        >
          {t('sunday.submit', lang)}
        </button>
      </div>
    </div>
  );
}
