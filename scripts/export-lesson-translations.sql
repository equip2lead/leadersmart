-- Export the French lesson bodies as ready-to-run UPDATE statements.
--
-- The translations were applied directly to the database, which is the only
-- place they can be authoritative: level_materials is church-scoped, so the
-- same twelve lessons exist once per tenant and a seed file would have to
-- re-target every copy. Run this to produce a portable snapshot — for a new
-- tenant, a restore, or review in a diff.
--
-- Matching is by title, deliberately. The twelve bodies are byte-identical
-- across tenants (verified: count(DISTINCT md5(lesson_content)) = 12 over 48
-- rows), so one UPDATE per title covers all four copies and cannot drift.
--
-- Usage, with a service-role connection:
--   psql "$DATABASE_URL" -At -f scripts/export-lesson-translations.sql \
--     > scripts/seed-lesson-translations-fr.sql
--
-- Dollar-quoted, so the apostrophes that French is full of need no escaping.

SELECT string_agg(stmt, E'\n\n' ORDER BY level, sort_order)
  FROM (
    SELECT DISTINCT ON (m.title)
           d.level,
           m.sort_order,
           format(
             E'-- Level %s · %s\nUPDATE level_materials SET lesson_content_fr = $fr$%s$fr$\n WHERE title = %L;',
             d.level, m.title, m.lesson_content_fr, m.title
           ) AS stmt
      FROM level_materials m
      JOIN level_definitions d ON d.id = m.level_definition_id
     WHERE m.has_lesson
       AND coalesce(m.lesson_content_fr, '') <> ''
     ORDER BY m.title, d.level, m.sort_order
  ) AS s;
