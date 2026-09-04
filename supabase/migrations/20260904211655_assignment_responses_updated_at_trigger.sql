-- assignment_responses shipped with an updated_at column but nothing to
-- maintain it, so it would have frozen at insert time the moment the
-- submission form started writing drafts. Same trigger the other tables use.
DROP TRIGGER IF EXISTS set_updated_at ON assignment_responses;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON assignment_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
