-- Scorecard ratings, append-only. One row per rating event, never updated,
-- so "you rated Self-Discipline 4/10 in September" stays true forever.
--
-- Keyed on user_id rather than leader_development_id, which is the one place
-- this table deliberately diverges from assignment_responses. Development
-- rows are per-enrolment: take a leader out of the pipeline and back in and
-- they get a new one, which would cascade their rating history away — the
-- exact history this table exists to keep. The person outlives the enrolment.
--
-- material_id, not lesson_id: there is no lessons table. Lessons are rows in
-- level_materials, and every other table already calls that material_id.
--
-- scorecard_key is ScorecardBlock.id and item_key is the id of an item inside
-- it, so ratings survive a lesson being re-ordered or re-worded — only
-- renaming a block id would orphan them.

CREATE TABLE IF NOT EXISTS user_pillar_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES level_materials(id) ON DELETE CASCADE,
  scorecard_key TEXT NOT NULL,
  item_key      TEXT NOT NULL,
  score         INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The read this table exists for is "latest score for this user + item",
-- and DESC ordering lets that be an index-only lookup rather than a sort.
CREATE INDEX IF NOT EXISTS user_pillar_scores_latest_idx
  ON user_pillar_scores (user_id, material_id, item_key, created_at DESC);

-- And the AI Coach's read: everything this person has ever rated, newest first.
CREATE INDEX IF NOT EXISTS user_pillar_scores_history_idx
  ON user_pillar_scores (user_id, created_at DESC);

ALTER TABLE user_pillar_scores ENABLE ROW LEVEL SECURITY;

-- Self-assessments are as personal as the written reflections, so reads match
-- the policy those settled on: your own, or a tenant admin's.
DROP POLICY IF EXISTS "user_pillar_scores_select" ON user_pillar_scores;
CREATE POLICY "user_pillar_scores_select" ON user_pillar_scores FOR SELECT
  USING (
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.church_id = get_my_church_id()
        AND (u.id = auth.uid() OR has_admin_rights())
    )
  );

-- Nobody rates on someone else's behalf, admins included — a score attributed
-- to you that you did not enter is worse than no score.
DROP POLICY IF EXISTS "user_pillar_scores_insert" ON user_pillar_scores;
CREATE POLICY "user_pillar_scores_insert" ON user_pillar_scores FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND user_id IN (SELECT u.id FROM users u WHERE u.church_id = get_my_church_id())
  );

-- No UPDATE policy, deliberately. The table is append-only: correcting a
-- score means recording a new one. With RLS on and no policy, UPDATE is
-- refused, so immutability is enforced by the database rather than by
-- everyone remembering.

DROP POLICY IF EXISTS "user_pillar_scores_delete" ON user_pillar_scores;
CREATE POLICY "user_pillar_scores_delete" ON user_pillar_scores FOR DELETE
  USING (
    user_id IN (SELECT u.id FROM users u WHERE u.church_id = get_my_church_id())
    AND is_owner()
  );
