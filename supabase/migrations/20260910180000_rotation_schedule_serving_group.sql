-- Which group served on a given Sunday.
--
-- The rotation rule is "A → B → C → D, continuing from last week's group,
-- across month boundaries". Continuing from last week requires knowing what
-- last week was, and nothing in the schema recorded it: rotation_schedules
-- carried the date and the publish state but not the group.
--
-- The alternative was deriving it — count the non-fifth Sundays since some
-- epoch and take it modulo four. That is stateless and superficially neat, but
-- it silently produces the wrong answer for any church that started mid-cycle,
-- and it changes retroactively the moment a fifth Sunday is added to or
-- removed from the year plan. What served on a past Sunday is a fact about
-- that Sunday, so it is stored on that Sunday's row.
--
-- Nullable: rows created before this column existed have no answer, and
-- inventing one would be worse than admitting it. The generator treats a NULL
-- as "no prior group" and starts from A.

ALTER TABLE rotation_schedules
  ADD COLUMN IF NOT EXISTS serving_group serving_group;

-- No new index: idx_rotation_schedules_church_date already covers
-- (church_id, service_date), and Postgres scans a btree backwards just as
-- well, so a DESC copy for the "most recent before X" lookup earns nothing.

COMMENT ON COLUMN rotation_schedules.serving_group IS
  'The group rostered for this Sunday. E means it is a fifth Sunday and A-D rest. NULL only on rows predating this column.';
