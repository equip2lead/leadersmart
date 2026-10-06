-- Clear both Security Advisor ERRORs from the lesson-audit session.
--
-- 1. test_data_summary — DROPPED.
--
-- A view with no security_invoker runs with its owner's rights, so it reported
-- fixture counts for every tenant regardless of who asked. Nothing in the app
-- reads it (src/ holds one comment explaining why not), and
-- test_data_counts() already answers the same question scoped to auth.uid().
--
-- This migration is what actually retires it. 20261001100000 and 20261001110000
-- both CREATE the view, and those files cannot be edited now that they are
-- applied — so without a later DROP the view would come back on any
-- `supabase db reset` and bring the ERROR with it.
--
-- scripts/seed-ministry-faithmin.sql was the only executable caller; its
-- verification query is now inline. test_data_counts() could not replace it
-- there: that script runs on a service-role connection where auth.uid() is
-- NULL, so the function would report zeros.
--
-- 2. level_materials_backup_before_fix — RLS ENABLED, NOT dropped.
--
-- The brief's own check said to stop if the lesson English fix had not been
-- applied, and it has not: all 48 rows still match the backup byte for byte on
-- lesson_content, lesson_content_fr, assignment_prompt and title. The 72
-- proposed changes in docs/lesson_fix_report.md are still awaiting review, so
-- this table is the pre-change snapshot for work that has not happened yet.
--
-- Enabling RLS with no policies closes the finding without destroying it:
-- PostgREST can reach nothing through anon or authenticated, while
-- service_role and the table owner bypass RLS and can still restore from it.
-- Dropping it is one line whenever the fixes land and the snapshot is spent.

DROP VIEW IF EXISTS public.test_data_summary;

ALTER TABLE public.level_materials_backup_before_fix ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.level_materials_backup_before_fix IS
  'Pre-change snapshot of the 48 lesson rows, taken before the fixes in docs/lesson_fix_report.md. RLS on with no policies: unreachable through the API, readable by service_role for a restore. Drop once those fixes are applied and verified.';
