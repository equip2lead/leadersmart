-- Rotation is a church-only module, and one churches opt into rather than get.
--
-- Two conditions gate it, and they are different in kind. Organization type is
-- structural: a ministry has no Sunday rotation to run, so the feature is not
-- merely off, it is absent. rotation_enabled is a choice: a church that has
-- one serving team has nothing to rotate yet and should not carry the UI for
-- it until it does.
--
-- Default FALSE, so every existing church keeps exactly the interface it has
-- today and nothing appears until someone asks for it.
--
-- The column lives on churches rather than in rotation_config because it
-- decides whether that config is ever reached. A flag inside the thing it
-- switches on cannot be read before deciding to switch it on.

BEGIN;

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS rotation_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN churches.rotation_enabled IS
  'Whether this church has opted into the Rotation module. Off by default. Ministry orgs ignore this column — organization_type excludes them regardless of its value.';

COMMIT;
