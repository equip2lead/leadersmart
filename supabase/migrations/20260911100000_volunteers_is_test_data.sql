-- Mark seeded fixtures as what they are.
--
-- Test data has a habit of surviving into production and then being
-- indistinguishable from the real thing: "Test Volunteer 1" is obvious, but a
-- realistically-named fixture is not, and the moment a church has both, a
-- name-pattern DELETE is a loaded gun. A column answers the question
-- definitively, so purging is exact rather than a guess at a LIKE pattern.
--
-- Scoped to volunteers only. Everything downstream — group memberships,
-- station preferences, assignments — reaches a volunteer by FK and cascades on
-- delete, so one flag on the root of that graph is enough to identify and
-- remove the whole fixture. Marking the derived tables too would be redundant
-- state that could disagree with itself.
--
-- Defaults FALSE, so every existing row and every real sign-up is real data
-- without anything having to say so. Only a deliberate seed sets it TRUE.

ALTER TABLE volunteers
  ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial: the flag is rare and only ever queried for the TRUE case (show the
-- badge, purge the fixture), so indexing the FALSE majority would be wasted.
CREATE INDEX IF NOT EXISTS volunteers_test_data_idx
  ON volunteers(church_id) WHERE is_test_data;

COMMENT ON COLUMN volunteers.is_test_data IS
  'TRUE only for deliberately seeded fixtures. Lets test volunteers be purged exactly rather than by matching names. Real sign-ups never set it.';

-- The four fixtures seeded by hand during Rotation P2 Commit 2 verification
-- predate this column, so they are back-filled rather than left looking real.
UPDATE volunteers
   SET is_test_data = TRUE
 WHERE full_name LIKE 'Test Volunteer %';
