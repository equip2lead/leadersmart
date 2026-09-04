-- Versioned assignment submissions: editing is always allowed, and every
-- submit records a new version rather than overwriting the last one.

ALTER TABLE assignment_responses
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- The old uniqueness rule was one response per lesson, full stop. It has to
-- go or version 2 can never be inserted.
--
-- Named explicitly: the constraint was created inline as
-- UNIQUE (leader_development_id, material_id), so Postgres auto-named it
-- assignment_responses_leader_development_id_material_id_key. A DROP against
-- a guessed name succeeds silently and leaves the real constraint standing,
-- which fails later at the first insert instead of here.
ALTER TABLE assignment_responses
  DROP CONSTRAINT IF EXISTS assignment_responses_leader_development_id_material_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS assignment_responses_lesson_version_idx
  ON assignment_responses (leader_development_id, material_id, version);

-- At most one open draft per lesson. Without this, two autosaves racing each
-- other create two draft rows and "the latest version" stops having a single
-- answer. Submitted and reviewed rows are unaffected, so history stacks up
-- freely underneath.
CREATE UNIQUE INDEX IF NOT EXISTS assignment_responses_one_open_draft_idx
  ON assignment_responses (leader_development_id, material_id)
  WHERE status = 'draft';

COMMENT ON COLUMN assignment_responses.version IS 'Monotonic per (leader, material). Highest version is current; lower versions are frozen history.';

-- Freezing submitted work is what makes the history trustworthy. The author
-- may edit only while a response is still a draft; moving past that means
-- creating the next version, not rewriting the last one. Admins keep full
-- update rights so a reviewer can still record a comment and mark a response
-- reviewed.
DROP POLICY IF EXISTS "assignment_responses_update" ON assignment_responses;
CREATE POLICY "assignment_responses_update" ON assignment_responses FOR UPDATE
  USING (
    (
      status = 'draft'
      AND leader_development_id IN (
        SELECT ld.id FROM leader_development ld
        WHERE ld.church_id = get_my_church_id() AND ld.user_id = auth.uid()
      )
    )
    OR (
      has_admin_rights()
      AND leader_development_id IN (
        SELECT ld.id FROM leader_development ld
        WHERE ld.church_id = get_my_church_id()
      )
    )
  );
