-- Purge every fixture row in the caller's own tenant, and report what went.
--
-- Scoped by is_test_data, never by a name pattern. That is the whole reason
-- the column exists: "Esther Mballa, Yaoundé branch" is indistinguishable
-- from a real record by inspection, and a LIKE-based purge against realistic
-- names is one typo away from deleting a ministry's actual data.
--
-- SECURITY DEFINER with an explicit owner check rather than SECURITY INVOKER.
-- Several of these tables have no DELETE policy at all for ordinary roles —
-- under RLS the deletes would silently affect zero rows and the function would
-- cheerfully report success. Running as definer makes the permission question
-- explicit and answers it in one place, which is also the only place that
-- needs auditing.
--
-- Deletion order is written out rather than left to cascades. branch_reports
-- and zones would fall with their branch anyway, but a cascade returns no
-- count, and a purge that cannot say what it removed is a purge nobody can
-- check afterwards.

CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS TABLE (table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_church UUID;
  v_role   TEXT;
  n        BIGINT;
BEGIN
  SELECT u.church_id, u.role::text INTO v_church, v_role
    FROM users u WHERE u.id = auth.uid();

  IF v_church IS NULL THEN
    RAISE EXCEPTION 'cleanup_test_data: no tenant for the calling user';
  END IF;
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'cleanup_test_data: owner role required, caller is %', v_role;
  END IF;

  -- Children first, so each count is the rows this function actually removed
  -- rather than a number a cascade had already taken.
  WITH d AS (
    DELETE FROM assignment_responses a
     USING leader_development l
     WHERE l.id = a.leader_development_id
       AND l.church_id = v_church
       AND a.is_test_data
    RETURNING a.id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'assignment_responses'::TEXT, n;

  WITH d AS (
    DELETE FROM leader_development
     WHERE church_id = v_church AND is_test_data
    RETURNING id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'leader_development'::TEXT, n;

  WITH d AS (
    DELETE FROM branch_reports r
     USING branches b
     WHERE b.id = r.branch_id
       AND b.church_id = v_church
       AND r.is_test_data
    RETURNING r.id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'branch_reports'::TEXT, n;

  WITH d AS (
    DELETE FROM zones z
     USING branches b
     WHERE b.id = z.branch_id
       AND b.church_id = v_church
       AND z.is_test_data
    RETURNING z.id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'zones'::TEXT, n;

  WITH d AS (
    DELETE FROM events
     WHERE church_id = v_church AND is_test_data
    RETURNING id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'events'::TEXT, n;

  WITH d AS (
    DELETE FROM branches
     WHERE church_id = v_church AND is_test_data
    RETURNING id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'branches'::TEXT, n;

  WITH d AS (
    DELETE FROM volunteers
     WHERE church_id = v_church AND is_test_data
    RETURNING id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'volunteers'::TEXT, n;

  -- Last, because leader_development points here. The matching auth.users rows
  -- are removed by the caller through the admin API: deleting them from SQL
  -- skips Supabase's own identity cleanup, and this function has no business
  -- reaching into the auth schema.
  WITH d AS (
    DELETE FROM users
     WHERE church_id = v_church AND is_test_data
    RETURNING id
  ) SELECT count(*) INTO n FROM d;
  RETURN QUERY SELECT 'users'::TEXT, n;
END
$$;

COMMENT ON FUNCTION cleanup_test_data() IS
  'Deletes every is_test_data row in the calling owner''s tenant and returns per-table counts. Owner only; raises otherwise.';

-- Only signed-in users may even attempt it; the owner check inside does the
-- real gatekeeping and raises for anyone else.
REVOKE ALL ON FUNCTION cleanup_test_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_test_data() TO authenticated;

-- Read-only sibling, so the UI can show what a purge would remove.
--
-- The app must NOT read test_data_summary for this. That view was created
-- without security_invoker, so it runs with its owner's rights and reports
-- every tenant's counts — fine for a dashboard SQL console, a cross-tenant
-- leak if rendered in a page. This function answers the same question for the
-- caller's own tenant only, which is the only answer a page should have.
CREATE OR REPLACE FUNCTION test_data_counts()
RETURNS TABLE (table_name TEXT, row_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  WITH me AS (SELECT church_id FROM users WHERE id = auth.uid())
  SELECT 'users'::TEXT, count(*) FROM users
   WHERE church_id = (SELECT church_id FROM me) AND is_test_data
  UNION ALL
  SELECT 'branches', count(*) FROM branches
   WHERE church_id = (SELECT church_id FROM me) AND is_test_data
  UNION ALL
  SELECT 'zones', count(*) FROM zones z JOIN branches b ON b.id = z.branch_id
   WHERE b.church_id = (SELECT church_id FROM me) AND z.is_test_data
  UNION ALL
  SELECT 'leader_development', count(*) FROM leader_development
   WHERE church_id = (SELECT church_id FROM me) AND is_test_data
  UNION ALL
  SELECT 'events', count(*) FROM events
   WHERE church_id = (SELECT church_id FROM me) AND is_test_data
  UNION ALL
  SELECT 'branch_reports', count(*) FROM branch_reports r JOIN branches b ON b.id = r.branch_id
   WHERE b.church_id = (SELECT church_id FROM me) AND r.is_test_data
  UNION ALL
  SELECT 'assignment_responses', count(*)
    FROM assignment_responses a JOIN leader_development l ON l.id = a.leader_development_id
   WHERE l.church_id = (SELECT church_id FROM me) AND a.is_test_data
  UNION ALL
  SELECT 'volunteers', count(*) FROM volunteers
   WHERE church_id = (SELECT church_id FROM me) AND is_test_data;
$$;

COMMENT ON FUNCTION test_data_counts() IS
  'Fixture row counts for the calling user''s own tenant. Safe to render; unlike test_data_summary it cannot report another tenant.';

REVOKE ALL ON FUNCTION test_data_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION test_data_counts() TO authenticated;
