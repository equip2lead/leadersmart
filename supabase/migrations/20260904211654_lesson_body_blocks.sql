-- Structured lesson content as an ordered array of typed blocks.
--
-- lesson_content (TEXT) stays exactly as it is. The 12 FIRE Bible Institute
-- lessons keep rendering from it, and a material is "structured" only when
-- lesson_body_blocks is non-null. That makes the cutover per-lesson rather
-- than a flag day, and old and new can coexist indefinitely.
--
-- Separate EN and FR columns because the display rule is no longer a
-- fallback: a reader asking for French gets French or gets told it isn't
-- ready yet. That question is only answerable if the two languages are
-- stored independently, which a merged per-block {en, fr} shape would not
-- give us without walking every block.

ALTER TABLE level_materials
  ADD COLUMN IF NOT EXISTS lesson_body_blocks    JSONB,
  ADD COLUMN IF NOT EXISTS lesson_body_blocks_fr JSONB;

COMMENT ON COLUMN level_materials.lesson_body_blocks IS 'Ordered array of typed lesson blocks (English). NULL means this lesson is unstructured and renders from lesson_content.';
COMMENT ON COLUMN level_materials.lesson_body_blocks_fr IS 'French blocks. NULL means not yet translated — the reader is told so rather than shown English.';

-- The renderer maps over these, so a non-array would be a runtime crash
-- rather than a bad render. Cheap to enforce here, and the constraint is
-- deliberately shallow: block shapes are validated in the application, so
-- adding a block type never needs a migration.
ALTER TABLE level_materials
  DROP CONSTRAINT IF EXISTS level_materials_blocks_are_arrays;
ALTER TABLE level_materials
  ADD CONSTRAINT level_materials_blocks_are_arrays CHECK (
    (lesson_body_blocks    IS NULL OR jsonb_typeof(lesson_body_blocks)    = 'array') AND
    (lesson_body_blocks_fr IS NULL OR jsonb_typeof(lesson_body_blocks_fr) = 'array')
  );

-- Lets the lesson list ask "which of these are structured / translated?"
-- without pulling whole block arrays across the wire.
CREATE INDEX IF NOT EXISTS level_materials_structured_idx
  ON level_materials ((lesson_body_blocks IS NOT NULL),
                      (lesson_body_blocks_fr IS NOT NULL));
