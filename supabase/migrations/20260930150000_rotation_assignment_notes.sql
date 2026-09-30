-- Why a particular person is on a particular Sunday, when it is not obvious.
--
-- Added for substitute assignments. The rotation rule is that a volunteer
-- serves on their own group's Sundays; a substitute is a deliberate exception,
-- and without somewhere to say so the exception is indistinguishable from a
-- scheduling bug six weeks later.
--
-- Free text rather than a boolean, because "is this a substitute" is the
-- question today and "why is this odd" is the question the column will
-- actually be asked. A flag would need a second column the first time a
-- different kind of exception appears.

ALTER TABLE rotation_assignments
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN rotation_assignments.notes IS
  'Why this assignment is unusual. Set for substitutes ("substitute — original group A"); null for a normal rostering.';
