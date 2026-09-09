-- Events — Phase 1.
--
-- What this table is for, and what it deliberately is not: an event here
-- records WHO SERVED and DID WE EXECUTE. There is no attendance count, no
-- offering total and no ticketing, because none of those are this product's
-- business. Phase 1 is also one row per occurrence — no recurrence rules — so
-- a weekly service is fifty-two rows, and that is the intended trade.
--
-- Scope is one-of, never both. An event belongs to a branch (a ministry
-- concept) or to a department (a church concept) or to neither, which is the
-- org-wide case. The CHECK enforces that rather than trusting the two dropdowns
-- to stay mutually exclusive in the UI.
--
-- event_type is TEXT, not an enum. Which types are offered depends on whether
-- the tenant is a church or a ministry, and that lives in the vocabulary layer
-- (src/lib/vocabulary.ts) exactly as it does for every other org-type
-- difference. An enum would push a display decision into the schema and make
-- an org-type switch a migration.

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  -- Both optional and mutually exclusive; see the CHECK below. ON DELETE SET
  -- NULL rather than CASCADE: deleting a department must not erase the history
  -- of the events it ran.
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  description TEXT,
  coordinator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),
  post_event_notes TEXT,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  CONSTRAINT events_scope_is_one_of CHECK (
    branch_id IS NULL OR department_id IS NULL
  )
);

CREATE INDEX IF NOT EXISTS events_church_idx ON events(church_id);
CREATE INDEX IF NOT EXISTS events_date_idx ON events(event_date);
CREATE INDEX IF NOT EXISTS events_status_idx ON events(status);
CREATE INDEX IF NOT EXISTS events_branch_idx ON events(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_department_idx ON events(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_coordinator_idx ON events(coordinator_user_id);

-- updated_at is maintained by the trigger, never by app code, so a client that
-- forgets to set it cannot leave a stale timestamp behind.
DROP TRIGGER IF EXISTS events_set_updated_at ON events;
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- SELECT: the whole church. An event is something the team is executing
-- together, so a volunteer needs to see it. Draft events are filtered in the
-- application rather than here — see the note on the drafts tab.
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT
  USING (church_id = get_my_church_id());

DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT
  WITH CHECK (
    church_id = get_my_church_id()
    AND has_admin_rights()
  );

DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE
  USING (
    church_id = get_my_church_id()
    AND has_admin_rights()
  );

-- DELETE is owner-only, matching every other destructive policy in this
-- schema. Cancelling is the reversible verb an admin_pastor gets.
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE
  USING (
    church_id = get_my_church_id()
    AND is_owner()
  );

COMMENT ON COLUMN events.event_type IS 'Vocabulary key, not an enum. Valid values depend on the tenant''s organization_type and are defined in src/lib/vocabulary.ts.';
COMMENT ON CONSTRAINT events_scope_is_one_of ON events IS 'An event is scoped to a branch (ministry) or a department (church) or neither — never both.';
