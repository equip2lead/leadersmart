-- Assignment responses are personal reflections — "what has changed most in
-- how you see yourself as a leader". The original SELECT policy let every
-- user in the tenant read every other leader's answers. This narrows it to
-- the author plus tenant admins.
--
-- Only the SELECT policy changes. INSERT, UPDATE and DELETE are left exactly
-- as they are.
--
-- Two notes on what this does NOT say:
--
-- 1. There is no coach or mentor table in this schema, and leader_development
--    has no mentor/coach column, so coach access is not expressible yet. Per
--    instruction this ships as author-plus-admin, and coach access follows
--    once an assignment table exists.
--
-- 2. The admin test is has_admin_rights() (owner + admin_pastor), not a
--    literal role list. user_role has no super_admin value, and every real
--    admin today is an owner or admin_pastor. Using the helper also keeps
--    SELECT consistent with the INSERT/UPDATE policies on this table, so
--    "who is an admin here" has exactly one definition.

DROP POLICY IF EXISTS "assignment_responses_select" ON assignment_responses;
CREATE POLICY "assignment_responses_select" ON assignment_responses FOR SELECT
  USING (
    leader_development_id IN (
      SELECT ld.id FROM leader_development ld
      WHERE ld.church_id = get_my_church_id()
        AND (ld.user_id = auth.uid() OR has_admin_rights())
    )
  );
