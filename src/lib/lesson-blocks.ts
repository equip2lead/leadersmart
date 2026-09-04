// The shape of structured lesson content stored in
// level_materials.lesson_body_blocks (and _fr).
//
// Two rules shape everything here:
//
// 1. Forward compatibility. Content is data, and data outlives the code that
//    reads it. A lesson authored with a block type this build has never heard
//    of must render the blocks it *does* understand and quietly skip the rest
//    — never blank the page. So parsing is permissive and the renderer is
//    expected to ignore what it cannot draw. Adding a block type is a content
//    change, not a migration.
//
// 2. Store the identity, not the URL. Video blocks hold a YouTube id rather
//    than an embed URL so the origin is ours to choose (youtube-nocookie) and
//    an author cannot paste a link that points anywhere else.

/** Every block carries a stable id so answers, anchors and scroll positions
    can refer to one without depending on array index. */
interface BlockBase {
  id: string;
}

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  level: 2 | 3 | 4;
  text: string;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  /** Inline markdown only — bold, italic, links. No block syntax: that is
      what the other block types are for. */
  text: string;
}

export interface QuoteBlock extends BlockBase {
  type: 'quote';
  text: string;
  attribution?: string;
}

export interface PullQuoteCardBlock extends BlockBase {
  type: 'pull_quote_card';
  text: string;
  attribution?: string;
}

export interface TableBlock extends BlockBase {
  type: 'table';
  /** Rendered as <th scope="col">. A table with no headers is still valid;
      it just loses its header row. */
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface VideoEmbedBlock extends BlockBase {
  type: 'video_embed';
  /** The bare YouTube id, e.g. 'dQw4w9WgXcQ' — not a URL. Embedded via
      youtube-nocookie.com. */
  youtubeId: string;
  title: string;
  /** Seconds; drives the duration hint next to the player. */
  durationSeconds?: number;
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;
  /** Required, and empty string is a legitimate value meaning "decorative".
      Making it optional is how alt text goes missing. */
  alt: string;
  caption?: string;
}

export interface ReflectionQuestionsBlock extends BlockBase {
  type: 'reflection_questions';
  prompt?: string;
  questions: string[];
}

/** "Rate yourself /10" rows. Answers are per-leader and are stored outside
    the lesson content itself — the block defines the instrument, not the
    response. */
export interface ScorecardBlock extends BlockBase {
  type: 'scorecard';
  title: string;
  instruction?: string;
  min: number;
  max: number;
  items: Array<{ id: string; label: string; helpText?: string }>;
}

export interface CalloutBlock extends BlockBase {
  type: 'callout';
  /** Drives colour and icon only. An unrecognised variant should fall back to
      'note' rather than disappear. */
  variant: 'note' | 'warning' | 'tip' | 'scripture';
  title?: string;
  text: string;
}

export interface DividerBlock extends BlockBase {
  type: 'divider';
}

/** Marks where the submission form is rendered inline. The prompt text still
    lives in level_materials.assignment_prompt, so a lesson cannot end up with
    two different questions disagreeing with each other. */
export interface AssignmentPromptBlock extends BlockBase {
  type: 'assignment_prompt';
  /** Optional lead-in shown above the form. */
  intro?: string;
}

export type LessonBlock =
  | HeadingBlock
  | ParagraphBlock
  | QuoteBlock
  | PullQuoteCardBlock
  | TableBlock
  | VideoEmbedBlock
  | ImageBlock
  | ReflectionQuestionsBlock
  | ScorecardBlock
  | CalloutBlock
  | DividerBlock
  | AssignmentPromptBlock;

export type LessonBlockType = LessonBlock['type'];

/** A block whose `type` this build does not implement. Kept rather than
    dropped so the renderer can decide (skip silently in production, surface
    loudly in an authoring preview). */
export interface UnknownBlock extends BlockBase {
  type: string;
  [key: string]: unknown;
}

export const KNOWN_BLOCK_TYPES: ReadonlySet<string> = new Set<LessonBlockType>([
  'heading',
  'paragraph',
  'quote',
  'pull_quote_card',
  'table',
  'video_embed',
  'image',
  'reflection_questions',
  'scorecard',
  'callout',
  'divider',
  'assignment_prompt',
]);

export function isKnownBlock(b: LessonBlock | UnknownBlock): b is LessonBlock {
  return KNOWN_BLOCK_TYPES.has(b.type);
}

/**
 * Turn whatever came out of JSONB into blocks.
 *
 * Deliberately forgiving: the column is CHECK-constrained to an array, but a
 * hand-authored row can still contain an entry that is not an object or has no
 * `type`. Those are dropped. Anything object-shaped with a string `type`
 * survives, even if unrecognised — see rule 1 at the top of this file.
 *
 * Returns null for null/absent content so callers can distinguish "no
 * structured body" from "structured body that happens to be empty", which is
 * the difference between falling back to lesson_content and rendering nothing.
 */
export function parseLessonBlocks(
  raw: unknown,
): Array<LessonBlock | UnknownBlock> | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;

  const out: Array<LessonBlock | UnknownBlock> = [];
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    if (typeof b !== 'object' || b === null || Array.isArray(b)) continue;
    const rec = b as Record<string, unknown>;
    if (typeof rec.type !== 'string' || rec.type === '') continue;
    // An author who omits `id` still gets a stable key within this render,
    // which is all anchors and React need.
    const id = typeof rec.id === 'string' && rec.id ? rec.id : `block-${i}`;
    out.push({ ...rec, id, type: rec.type } as LessonBlock | UnknownBlock);
  }
  return out;
}

/** True when a lesson has structured content in the requested language.
    Drives the "not yet available in French" notice — deliberately not a
    fallback to the other language. */
export function hasBlocksFor(
  material: { lesson_body_blocks: unknown; lesson_body_blocks_fr: unknown },
  lang: 'en' | 'fr',
): boolean {
  const raw =
    lang === 'fr' ? material.lesson_body_blocks_fr : material.lesson_body_blocks;
  const blocks = parseLessonBlocks(raw);
  return blocks !== null && blocks.length > 0;
}
