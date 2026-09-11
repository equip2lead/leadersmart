'use client';

import { useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, MoreVertical } from 'lucide-react';
import { t } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/types';

// A volunteer chip and a station cell — the two halves of the drag surface.
//
// Drag is deliberately not the only way to move someone. Pointer dragging is
// unusable with a keyboard, awkward on a phone, and impossible with several
// assistive technologies, so every chip also carries a "Move to…" menu that
// performs exactly the same action. The menu is the real interface; dragging
// is the shortcut.

export type ChipTarget = { stationId: string; date: string; label: string };

export function AssignmentChip({
  lang,
  assignmentId,
  name,
  disabled,
  targets,
  onMove,
}: {
  lang: AppLanguage;
  assignmentId: string;
  name: string;
  /** Published weeks are frozen — the chip renders but does not move. */
  disabled: boolean;
  /** Every other cell this chip could go to, already labelled. */
  targets: ChipTarget[];
  onMove: (assignmentId: string, stationId: string, date: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: assignmentId,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={
        'group relative flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition ' +
        (isDragging
          ? 'border-indigo-royal-300 bg-indigo-royal-50 opacity-40'
          : 'border-gray-200 bg-gray-50 text-ink') +
        (disabled ? '' : ' hover:border-indigo-royal-200')
      }
    >
      {!disabled && (
        <button
          type="button"
          // The drag handle is the grip only, not the whole chip: the menu
          // button beside it must stay clickable rather than starting a drag.
          {...listeners}
          {...attributes}
          aria-label={name}
          className="cursor-grab touch-none text-gray-300 hover:text-muted active:cursor-grabbing"
        >
          <GripVertical className="h-3 w-3" aria-hidden="true" />
        </button>
      )}

      <span className="min-w-0 flex-1 truncate">{name}</span>

      {!disabled && targets.length > 0 && (
        <>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('rotation.admin.dnd.move_menu_label', lang).replace(
              '{name}',
              name,
            )}
            onClick={() => setMenuOpen((v) => !v)}
            className="shrink-0 text-gray-300 hover:text-muted"
          >
            <MoreVertical className="h-3 w-3" aria-hidden="true" />
          </button>

          {menuOpen && (
            <>
              {/* Click-away layer. Rendered before the menu so the menu sits
                  above it and its own clicks still land. */}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-card"
              >
                <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {t('rotation.admin.dnd.move_to', lang)}
                </p>
                {targets.map((target) => (
                  <button
                    key={`${target.date}:${target.stationId}`}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(assignmentId, target.stationId, target.date);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-body hover:bg-gray-50 hover:text-ink"
                  >
                    {target.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function StationCell({
  stationId,
  date,
  disabled,
  children,
}: {
  stationId: string;
  date: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  // The droppable id encodes both axes, so one string identifies a cell in the
  // two-dimensional grid without a lookup table.
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}::${stationId}`,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={
        '-m-1 min-h-[2.5rem] rounded-lg p-1 transition ' +
        (isOver ? 'bg-indigo-royal-50 ring-2 ring-indigo-royal-300' : '')
      }
    >
      {children}
    </div>
  );
}
