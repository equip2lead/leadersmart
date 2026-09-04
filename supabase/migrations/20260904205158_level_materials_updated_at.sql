-- level_materials gained lesson content but had no modification timestamp:
-- only created_at. The lesson seed tried to set updated_at and aborted
-- because the column did not exist. This adds it for real.
--
-- Backfilled from created_at rather than now(), so the 68 materials nobody
-- has touched don't all claim to have been edited at migration time. The 12
-- seeded lessons are stamped separately below, which is true: their content
-- changed today.

ALTER TABLE level_materials
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE level_materials SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE level_materials ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE level_materials ALTER COLUMN updated_at SET NOT NULL;

COMMENT ON COLUMN level_materials.updated_at IS 'Maintained by the set_updated_at trigger; do not set by hand';

-- Same shape as the other 16 tables carrying this column: a BEFORE UPDATE
-- trigger named set_updated_at on the shared update_updated_at_column().
-- Because the trigger maintains the value, callers no longer need to write
-- `updated_at = NOW()` themselves — and if they do, the trigger overwrites
-- it with the same value anyway.
DROP TRIGGER IF EXISTS set_updated_at ON level_materials;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON level_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- The stamp the seed migration was meant to apply to its 12 lessons.
UPDATE level_materials SET updated_at = NOW() WHERE has_lesson;
