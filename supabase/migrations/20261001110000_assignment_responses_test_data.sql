-- The one fixture-bearing table the earlier sweep missed.
--
-- 20261001100000 flagged the six tables a demo tenant populates directly, but
-- an assignment submission is a seeded row too: the demo needs a mentor review
-- queue with something in it. Without the flag these rows are reachable as
-- fixtures only by joining back through leader_development, which is exactly
-- the kind of inference a purge should not have to make.

ALTER TABLE assignment_responses
  ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS assignment_responses_test_data_idx
  ON assignment_responses(leader_development_id) WHERE is_test_data;

-- Re-stated in full rather than patched: a view has no ALTER that appends a
-- branch, and the seventh arm reaches its church through leader_development
-- the same way zones reach theirs through branches.
CREATE OR REPLACE VIEW test_data_summary AS
  SELECT c.name AS church, c.organization_type::text AS org_type,
         'users'::text AS table_name, count(*) AS test_rows
    FROM users u JOIN churches c ON c.id = u.church_id
   WHERE u.is_test_data GROUP BY c.name, c.organization_type
  UNION ALL
  SELECT c.name, c.organization_type::text, 'branches', count(*)
    FROM branches b JOIN churches c ON c.id = b.church_id
   WHERE b.is_test_data GROUP BY c.name, c.organization_type
  UNION ALL
  SELECT c.name, c.organization_type::text, 'zones', count(*)
    FROM zones z JOIN branches b ON b.id = z.branch_id
                 JOIN churches c ON c.id = b.church_id
   WHERE z.is_test_data GROUP BY c.name, c.organization_type
  UNION ALL
  SELECT c.name, c.organization_type::text, 'leader_development', count(*)
    FROM leader_development l JOIN churches c ON c.id = l.church_id
   WHERE l.is_test_data GROUP BY c.name, c.organization_type
  UNION ALL
  SELECT c.name, c.organization_type::text, 'events', count(*)
    FROM events e JOIN churches c ON c.id = e.church_id
   WHERE e.is_test_data GROUP BY c.name, c.organization_type
  UNION ALL
  SELECT c.name, c.organization_type::text, 'branch_reports', count(*)
    FROM branch_reports r JOIN branches b ON b.id = r.branch_id
                          JOIN churches c ON c.id = b.church_id
   WHERE r.is_test_data GROUP BY c.name, c.organization_type
  UNION ALL
  SELECT c.name, c.organization_type::text, 'assignment_responses', count(*)
    FROM assignment_responses a
         JOIN leader_development l ON l.id = a.leader_development_id
         JOIN churches c ON c.id = l.church_id
   WHERE a.is_test_data GROUP BY c.name, c.organization_type
  UNION ALL
  SELECT c.name, c.organization_type::text, 'volunteers', count(*)
    FROM volunteers v JOIN churches c ON c.id = v.church_id
   WHERE v.is_test_data GROUP BY c.name, c.organization_type;

COMMENT ON VIEW test_data_summary IS
  'Fixture rows per tenant per table. Read it before purging, so a cleanup is aimed at a known count rather than a guess.';
