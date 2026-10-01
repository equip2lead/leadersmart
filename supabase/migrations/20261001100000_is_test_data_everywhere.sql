-- Extend the test-data flag beyond volunteers, and give it a summary view.
--
-- is_test_data was added for the rotation fixture and only ever landed on
-- volunteers. Seeding a whole demo tenant — branches, zones, leaders, events,
-- reports and the user accounts behind them — needs the same guarantee
-- everywhere, for the same reason: a fixture named "Esther Mballa" in Yaoundé
-- is indistinguishable from a real record by inspection, and a purge that
-- matches on names is one typo from deleting a ministry's actual data.
--
-- users carries it too, because leader_development.user_id is NOT NULL and
-- FKs users, which in turn FKs auth.users. Eight demo leaders means eight
-- accounts, and those accounts need to be identifiable as fixtures just as
-- much as the rows that point at them.
--
-- Defaults FALSE everywhere, so every existing row and every real sign-up is
-- real data without anything having to say so.

ALTER TABLE users              ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE branches           ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE zones              ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leader_development ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events             ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE branch_reports     ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial indexes: the flag is rare and only ever queried for the TRUE case,
-- so indexing the FALSE majority would be wasted pages.
CREATE INDEX IF NOT EXISTS users_test_data_idx              ON users(church_id)   WHERE is_test_data;
CREATE INDEX IF NOT EXISTS branches_test_data_idx           ON branches(church_id) WHERE is_test_data;
CREATE INDEX IF NOT EXISTS zones_test_data_idx              ON zones(branch_id)    WHERE is_test_data;
CREATE INDEX IF NOT EXISTS leader_development_test_data_idx ON leader_development(church_id) WHERE is_test_data;
CREATE INDEX IF NOT EXISTS events_test_data_idx             ON events(church_id)   WHERE is_test_data;
CREATE INDEX IF NOT EXISTS branch_reports_test_data_idx     ON branch_reports(branch_id) WHERE is_test_data;

-- One place to answer "what is fixture and what is real", per tenant.
--
-- zones and branch_reports reach their church through branches rather than
-- carrying church_id themselves, which is why those two are joined rather
-- than grouped directly.
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
  SELECT c.name, c.organization_type::text, 'volunteers', count(*)
    FROM volunteers v JOIN churches c ON c.id = v.church_id
   WHERE v.is_test_data GROUP BY c.name, c.organization_type;

COMMENT ON VIEW test_data_summary IS
  'Fixture rows per tenant per table. Read it before purging, so a cleanup is aimed at a known count rather than a guess.';
