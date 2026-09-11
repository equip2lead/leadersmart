-- Seed 28 volunteers for FIRE CHURCH so the rotation algorithm has enough
-- people to actually exercise.
--
-- Deliberately NOT a migration. Migrations run in every environment and on
-- every fresh clone; this is one church's test fixture and belongs nowhere
-- near that. Run it by hand against the environment that wants it.
--
-- Every row is marked is_test_data = TRUE, which is the whole point of that
-- column: these names are realistic enough to be mistaken for real sign-ups,
-- so the only safe way to remove them later is the flag, not a name pattern.
--
-- Idempotent: re-running deletes the previous fixture first (cascading to
-- memberships, preferences and assignments) and rebuilds it, so the script can
-- be edited and re-applied without accumulating duplicates.
--
-- To remove entirely:
--   DELETE FROM volunteers WHERE is_test_data AND church_id = '<church>';

BEGIN;

WITH church AS (
  SELECT id FROM churches WHERE name = 'FIRE CHURCH'
),
-- Clear any previous run. Scoped by the flag, so real sign-ups are untouched
-- even though they sit in the same table.
wiped AS (
  DELETE FROM volunteers
  WHERE church_id = (SELECT id FROM church)
    AND is_test_data
  RETURNING id
),
-- 28 names across anglophone and francophone Cameroon, gender-balanced.
-- Column 3 is the primary rotation group; column 4 is whether they also serve
-- on fifth Sundays. Six per group A-D (24), plus four who are Group E only.
people(full_name, phone_suffix, primary_group, also_e) AS (
  VALUES
    ('Achille Mbarga',      '101', 'A'::serving_group, FALSE),
    ('Clarisse Atangana',   '102', 'A'::serving_group, TRUE ),
    ('Emmanuel Onana',      '103', 'A'::serving_group, FALSE),
    ('Ghislaine Mvondo',    '104', 'A'::serving_group, FALSE),
    ('Landry Njoya',        '105', 'A'::serving_group, TRUE ),
    ('Mireille Zambo',      '106', 'A'::serving_group, FALSE),

    ('Arnaud Fotso',        '107', 'B'::serving_group, FALSE),
    ('Delphine Essomba',    '108', 'B'::serving_group, FALSE),
    ('Franck Tagne',        '109', 'B'::serving_group, TRUE ),
    ('Ingrid Eyenga',       '110', 'B'::serving_group, FALSE),
    ('Marcel Ebongue',      '111', 'B'::serving_group, FALSE),
    ('Nadege Meka',         '112', 'B'::serving_group, FALSE),

    ('Blaise Ndongo',       '113', 'C'::serving_group, FALSE),
    ('Estelle Nkodo',       '114', 'C'::serving_group, FALSE),
    ('Herve Wandji',        '115', 'C'::serving_group, TRUE ),
    ('Judith Manga',        '116', 'C'::serving_group, FALSE),
    ('Narcisse Sadjo',      '117', 'C'::serving_group, FALSE),
    ('Rosine Kemajou',      '118', 'C'::serving_group, FALSE),

    ('Cedric Kamdem',       '119', 'D'::serving_group, FALSE),
    ('Leonie Owona',        '120', 'D'::serving_group, FALSE),
    ('Olivier Tchoumi',     '121', 'D'::serving_group, TRUE ),
    ('Pascaline Mbida',     '122', 'D'::serving_group, FALSE),
    ('Serge Bikoi',         '123', 'D'::serving_group, FALSE),
    ('Sylvie Ngo Bassong',  '124', 'D'::serving_group, FALSE),

    -- Fifth-Sunday only: they serve when A-D rest.
    ('Joseph Bilong',       '125', 'E'::serving_group, FALSE),
    ('Raoul Nganou',        '126', 'E'::serving_group, FALSE),
    ('Thierry Djoumessi',   '127', 'E'::serving_group, FALSE),
    ('Yvette Ateba',        '128', 'E'::serving_group, FALSE)
),
inserted AS (
  INSERT INTO volunteers
    (church_id, full_name, whatsapp_phone, email, serving_group, status, is_test_data)
  SELECT (SELECT id FROM church),
         p.full_name,
         '+2376' || p.phone_suffix || '0000',
         NULL,
         p.primary_group,
         'active',
         TRUE
  FROM people p
  RETURNING id, full_name, serving_group
),
-- Primary group membership for everyone.
primary_membership AS (
  INSERT INTO volunteer_group_memberships (church_id, volunteer_id, serving_group)
  SELECT (SELECT id FROM church), i.id, i.serving_group
  FROM inserted i
  ON CONFLICT (volunteer_id, serving_group) DO NOTHING
  RETURNING volunteer_id
),
-- The five who hold a rotation group AND Group E. This is the multi-group
-- case: they serve their own week and the fifth Sunday too.
e_membership AS (
  INSERT INTO volunteer_group_memberships (church_id, volunteer_id, serving_group)
  SELECT (SELECT id FROM church), i.id, 'E'::serving_group
  FROM inserted i
  JOIN people p ON p.full_name = i.full_name
  WHERE p.also_e
  ON CONFLICT (volunteer_id, serving_group) DO NOTHING
  RETURNING volunteer_id
),
-- Station preferences, spread so the variety rule has something to work with.
-- Roughly a quarter get none at all, which the generator reads as "willing
-- anywhere" — that path needs coverage too.
station_prefs AS (
  INSERT INTO volunteer_station_preferences (volunteer_id, station_id, is_excluded)
  SELECT i.id, s.id, FALSE
  FROM inserted i
  JOIN LATERAL (
    SELECT st.id, row_number() OVER (ORDER BY st.display_order, st.name) AS rn
    FROM rotation_stations st
    WHERE st.church_id = (SELECT id FROM church)
      AND st.is_active AND NOT st.is_fire_kids
  ) s ON TRUE
  -- A deterministic spread keyed on the name's hash: every volunteer gets a
  -- stable, arbitrary subset rather than a random one that changes per run.
  WHERE (abs(hashtext(i.full_name)) % 4) <> 3
    AND ((abs(hashtext(i.full_name)) / (s.rn * 7)) % 2) = 0
  RETURNING volunteer_id
)
SELECT
  (SELECT count(*) FROM wiped)              AS previous_fixture_removed,
  (SELECT count(*) FROM inserted)           AS volunteers_created,
  (SELECT count(*) FROM primary_membership) AS primary_memberships,
  (SELECT count(*) FROM e_membership)       AS extra_group_e_memberships,
  (SELECT count(*) FROM station_prefs)      AS station_preferences;

COMMIT;
