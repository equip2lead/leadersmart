'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 17 Sunday checklist items grouped by phase.
// These are placeholder items until the spec doc is shared — replace with the
// exact wording provided in the LeaderSmart project specification.
const ITEMS: Array<{ group: string; items: Array<{ id: string; label: string }> }> = [
  {
    group: 'Pre-service',
    items: [
      { id: 'pre.1', label: 'Confirm worship set list with worship leader' },
      { id: 'pre.2', label: 'Verify sound and video check complete' },
      { id: 'pre.3', label: 'Walk through the sanctuary with ushers' },
      { id: 'pre.4', label: 'Check children\'s ministry rooms ready' },
      { id: 'pre.5', label: 'Confirm speaker/sermon handoff' },
      { id: 'pre.6', label: 'Leadership prayer meeting done' },
    ],
  },
  {
    group: 'During service',
    items: [
      { id: 'dur.1', label: 'Opening on time' },
      { id: 'dur.2', label: 'Announcements clear and brief' },
      { id: 'dur.3', label: 'Offering received' },
      { id: 'dur.4', label: 'New visitors welcomed' },
      { id: 'dur.5', label: 'Communication to parents done' },
    ],
  },
  {
    group: 'Post-service',
    items: [
      { id: 'post.1', label: 'Greet visitors at exit' },
      { id: 'post.2', label: 'Offering counted and signed off' },
      { id: 'post.3', label: 'Children checked out to parents' },
      { id: 'post.4', label: 'Issues logged for leadership review' },
      { id: 'post.5', label: 'Building locked and secured' },
      { id: 'post.6', label: 'Attendance count recorded' },
    ],
  },
];

type ChecklistProps = {
  assignmentId: string;
  existingId: string | null;
  initialItems: Record<string, boolean>;
  initialAttendance: number | null;
  initialOffering: number | null;
  initialVisitors: number | null;
  initialIssues: string;
};

export function ChecklistForm({
  assignmentId,
  existingId,
  initialItems,
  initialAttendance,
  initialOffering,
  initialVisitors,
  initialIssues,
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

  // Auto-save every 15s while dirty
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

  const totalItems = ITEMS.reduce((sum, g) => sum + g.items.length, 0);
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
              Progress: <strong className="text-ink">{checkedCount}/{totalItems}</strong>
            </p>
            {lastSaved && (
              <p className="text-xs text-muted">Saved at {lastSaved}</p>
            )}
          </div>
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-brand-700 transition-all"
              style={{ width: `${Math.round((checkedCount / totalItems) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {ITEMS.map((group) => (
        <div key={group.group} className="card">
          <h3 className="text-base font-semibold text-ink">{group.group}</h3>
          <ul className="mt-4 space-y-2">
            {group.items.map((item) => {
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
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="card space-y-4">
        <h3 className="text-base font-semibold text-ink">Service numbers</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="att">Attendance</label>
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
            <label className="label" htmlFor="off">Offering total</label>
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
            <label className="label" htmlFor="vis">New visitors</label>
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
          <label className="label" htmlFor="iss">Issues or notes</label>
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
          Save draft
        </button>
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={saving}
          className="btn-primary"
        >
          Submit checklist
        </button>
      </div>
    </div>
  );
}
