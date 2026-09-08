// Formatter for level_materials.lesson_content — the *unstructured* lesson
// body. Materials that carry lesson_body_blocks render through the block
// schema in ./lesson-blocks.ts instead; this module is the fallback path for
// the plain-text lessons seeded from the FIRE Bible Institute PDFs.
//
// Those PDFs were extracted with hard line wrapping, so a single newline is a
// typographic accident and only a blank line is a real paragraph break. That
// one fact drives every rule below: single newlines inside a block are joined
// back into flowing prose, and structure is inferred only from blank lines,
// bullet markers, and shouted heading lines.
//
// Nothing here renders HTML. The parser returns data and the viewer draws it,
// so author-supplied text can never introduce markup.

export type InlineSpan = { text: string; bold: boolean };

export type LessonNode =
  | { kind: 'heading'; spans: InlineSpan[] }
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'list'; items: InlineSpan[][] };

/** Longest line still eligible to be read as a heading. A shouted sentence
    runs longer than this; a section label does not. */
const MAX_HEADING_LENGTH = 80;

const BULLET_PREFIX = /^\s*[-*•]\s+/;

/**
 * Split inline markdown bold out of a line.
 *
 * Only `**bold**` is recognised. Underscores and single asterisks are left
 * alone: ministry copy uses them as literal punctuation far more often than as
 * emphasis, and a false positive silently eats the marker characters.
 * An unclosed `**` is likewise left as literal text rather than bolding the
 * remainder of the lesson.
 */
export function parseInline(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    if (m.index > cursor) {
      spans.push({ text: line.slice(cursor, m.index), bold: false });
    }
    spans.push({ text: m[1], bold: true });
    cursor = m.index + m[0].length;
  }
  if (cursor < line.length) {
    spans.push({ text: line.slice(cursor), bold: false });
  }
  // A line that was entirely one bold run, or entirely empty, still needs a
  // span so callers never have to special-case an empty array.
  return spans.length > 0 ? spans : [{ text: line, bold: false }];
}

/**
 * A line the source shouted rather than wrote — "LESSON 1: INTRODUCTORY
 * LEADERSHIP", "THOUGHTS/CONCEPTS". Uppercasing is the only signal the
 * extracted text preserves, so it is the only one available.
 *
 * Requires at least one cased letter, so a line of digits or dashes is not
 * promoted, and caps out at MAX_HEADING_LENGTH so a shouted paragraph stays a
 * paragraph.
 */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_HEADING_LENGTH) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(trimmed)) return false;
  // Compare against the lowercased form too: a string with no cased
  // characters at all is equal to its own uppercase and would slip through.
  return trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
}

/**
 * Turn a plain-text lesson into renderable nodes.
 *
 * Returns an empty array for null/blank content so the viewer can show its
 * "no lesson text yet" state without a null check at every callsite.
 */
export function formatLessonContent(raw: string | null): LessonNode[] {
  if (!raw) return [];

  const nodes: LessonNode[] = [];
  // Blocks are separated by one or more blank lines; the whitespace-tolerant
  // split keeps blocks apart even when a "blank" line carries stray spaces.
  const blocks = raw.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');

    // Paragraph text and list items accumulate as the block is walked, and
    // flush whenever the line kind changes. That is what lets one blank-line
    // block hold a heading, a sentence and a bullet list without the three
    // bleeding into each other.
    let paragraph: string[] = [];
    let list: InlineSpan[][] = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) return;
      // Join with a space, not a newline: inside a block, a line ending is
      // where the PDF ran out of width, not where the sentence ended.
      nodes.push({ kind: 'paragraph', spans: parseInline(paragraph.join(' ')) });
      paragraph = [];
    };
    const flushList = () => {
      if (list.length === 0) return;
      nodes.push({ kind: 'list', items: list });
      list = [];
    };

    for (const line of lines) {
      if (line.trim() === '') continue;

      if (BULLET_PREFIX.test(line)) {
        flushParagraph();
        list.push(parseInline(line.replace(BULLET_PREFIX, '').trim()));
        continue;
      }

      flushList();

      if (isHeadingLine(line)) {
        flushParagraph();
        nodes.push({ kind: 'heading', spans: parseInline(line.trim()) });
        continue;
      }

      paragraph.push(line.trim());
    }

    flushParagraph();
    flushList();
  }

  return nodes;
}
