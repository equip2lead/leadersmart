import type { Church } from './types';

// One definition of "may this org use Rotation", so the sidebar and the route
// guard can never disagree. A link that appears for someone the guard would
// bounce is worse than no link at all.
//
// The two conditions are deliberately checked together and never apart:
//
//   organization_type === 'church'  — structural. A ministry has no Sunday
//     rotation to run, so the module is absent, not switched off. There is no
//     toggle for them to find and no state in which they get one.
//
//   rotation_enabled                — a choice. A church that does not
//     alternate serving teams should not carry the UI for it.
//
// Reading rotation_enabled on its own would let a ministry with a stray TRUE
// in that column reach the feature, which is why callers get this and not the
// column.

export function canUseRotation(church: Church): boolean {
  return church.organization_type === 'church' && church.rotation_enabled;
}

/** True when the Settings toggle should be offered at all. A ministry never
    sees it — the module is not theirs to enable — so this is the org-type half
    of canUseRotation without the opt-in half. */
export function canToggleRotation(church: Church): boolean {
  return church.organization_type === 'church';
}

/** Query string that tells /settings to explain why the visitor was sent
    there. Shared so the guard and the banner agree on the spelling. */
export const ROTATION_DISABLED_NOTICE = 'rotation_disabled';
