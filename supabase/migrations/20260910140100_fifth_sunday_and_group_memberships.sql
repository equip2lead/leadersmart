-- Fifth-Sunday dates and multi-group membership.
--
-- Two tables, both church-scoped, both following the RLS discipline already
-- established: read is church-wide, write is has_admin_rights(), destroy is
-- is_owner().

-- ---------------------------------------------------------------------------
-- fifth_sunday_dates — which Sundays belong to Group E, per church per year.
--
-- Computed rather than stored would be cheaper, but it is stored on purpose:
-- a church may decide a particular fifth Sunday is a conference weekend and
-- nobody rotates. is_active lets an admin switch one off without deleting the
-- year's plan and re-running it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fifth_sunday_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  -- Denormalised from service_date so the year selector is an index lookup
  -- rather than a scan with date_part() on every row.
  year INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, service_date)
);
CREATE INDEX IF NOT EXISTS fifth_sunday_church_year_idx
  ON fifth_sunday_dates(church_id, year);

ALTER TABLE fifth_sunday_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fifth_sunday_select" ON fifth_sunday_dates;
CREATE POLICY "fifth_sunday_select" ON fifth_sunday_dates FOR SELECT
  USING (church_id = get_my_church_id());

DROP POLICY IF EXISTS "fifth_sunday_insert" ON fifth_sunday_dates;
CREATE POLICY "fifth_sunday_insert" ON fifth_sunday_dates FOR INSERT
  WITH CHECK (church_id = get_my_church_id() AND has_admin_rights());

DROP POLICY IF EXISTS "fifth_sunday_update" ON fifth_sunday_dates;
CREATE POLICY "fifth_sunday_update" ON fifth_sunday_dates FOR UPDATE
  USING (church_id = get_my_church_id() AND has_admin_rights());

DROP POLICY IF EXISTS "fifth_sunday_delete" ON fifth_sunday_dates;
CREATE POLICY "fifth_sunday_delete" ON fifth_sunday_dates FOR DELETE
  USING (church_id = get_my_church_id() AND is_owner());

-- ---------------------------------------------------------------------------
-- volunteer_group_memberships — a volunteer's groups, one row each.
--
-- volunteers.serving_group already exists and stays: it is NOT NULL, it is
-- what Phase 1 wrote, and it remains the volunteer's *primary* group. This
-- table is what makes "in A and also in E" expressible, which a single column
-- cannot say. The sign-up path writes both, keeping the column in step with
-- the row that names the same group.
--
-- The UNIQUE on (volunteer_id, serving_group) is what makes membership
-- idempotent — adding someone to Group E twice is a no-op, not a duplicate.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS volunteer_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  serving_group serving_group NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (volunteer_id, serving_group)
);
CREATE INDEX IF NOT EXISTS vgm_church_group_idx
  ON volunteer_group_memberships(church_id, serving_group);
CREATE INDEX IF NOT EXISTS vgm_volunteer_idx
  ON volunteer_group_memberships(volunteer_id);

ALTER TABLE volunteer_group_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vgm_select" ON volunteer_group_memberships;
CREATE POLICY "vgm_select" ON volunteer_group_memberships FOR SELECT
  USING (church_id = get_my_church_id());

-- A signed-in volunteer may add themselves to a group; an admin may add
-- anyone in the church. The self case is reached through volunteers.user_id,
-- which is only set for the in-app opt-in — a public sign-up has no auth user
-- to match and is written by the service role instead.
DROP POLICY IF EXISTS "vgm_insert" ON volunteer_group_memberships;
CREATE POLICY "vgm_insert" ON volunteer_group_memberships FOR INSERT
  WITH CHECK (
    church_id = get_my_church_id()
    AND (
      has_admin_rights()
      OR volunteer_id IN (
        SELECT v.id FROM volunteers v
        WHERE v.church_id = get_my_church_id() AND v.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "vgm_update" ON volunteer_group_memberships;
CREATE POLICY "vgm_update" ON volunteer_group_memberships FOR UPDATE
  USING (
    church_id = get_my_church_id()
    AND (
      has_admin_rights()
      OR volunteer_id IN (
        SELECT v.id FROM volunteers v
        WHERE v.church_id = get_my_church_id() AND v.user_id = auth.uid()
      )
    )
  );

-- Removing a membership changes who serves, so it is an admin decision even
-- when it is the volunteer's own row.
DROP POLICY IF EXISTS "vgm_delete" ON volunteer_group_memberships;
CREATE POLICY "vgm_delete" ON volunteer_group_memberships FOR DELETE
  USING (church_id = get_my_church_id() AND has_admin_rights());

COMMENT ON TABLE volunteer_group_memberships IS 'A volunteer''s group memberships. volunteers.serving_group remains the primary group; this table adds the ability to hold several at once (typically A-D plus E).';
COMMENT ON COLUMN fifth_sunday_dates.is_active IS 'Lets an admin exempt one fifth Sunday without discarding the year plan.';
