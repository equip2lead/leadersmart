-- Group E — the fifth-Sunday group.
--
-- Split from the tables that use it (see the next migration) because
-- PostgreSQL will not let a new enum value be *used* in the transaction that
-- adds it. Adding the label and creating a column of that type are two
-- separate commits by necessity, not by preference.
--
-- E is not a fifth rotation slot. A/B/C/D take their turn week by week; E
-- serves only on the fifth Sunday of a month that has one, and on those
-- Sundays A-D rest entirely. That is why a volunteer can hold both a regular
-- group and E at the same time — the two never collide on the same date.

ALTER TYPE serving_group ADD VALUE IF NOT EXISTS 'E';
