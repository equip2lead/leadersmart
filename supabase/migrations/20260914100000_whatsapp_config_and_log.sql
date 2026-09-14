-- Per-tenant WhatsApp credentials, and a log of everything sent.
--
-- Two tables with deliberately different access rules, because they hold
-- different kinds of thing: one holds secrets, the other holds history.

-- ---------------------------------------------------------------------------
-- church_whatsapp_config — one row per church, holding that church's own
-- provider credentials.
--
-- Writes are owner-only. Not has_admin_rights(): an access token is a
-- credential that can send messages in the church's name to its whole
-- volunteer list, and that is a narrower trust than "can administer". Reads
-- are admin-wide so the Settings page can show connection state, but the
-- application never returns the token itself to a browser — see the comment
-- on wamatas_access_token.
--
-- Columns are provider-specific on purpose rather than a generic JSONB bag.
-- A bag would mean no constraint can say which fields a given provider needs,
-- and the factory would have to guess. Adding Genuka or Meta Cloud means
-- adding their columns.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS church_whatsapp_config (
  church_id UUID PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'wamatas'
    CHECK (provider IN ('wamatas', 'genuka', 'meta_cloud')),
  -- Stays FALSE until a test send has actually succeeded. Storing credentials
  -- is not the same as knowing they work, and publishing a rota should not be
  -- the moment a church discovers its token is wrong.
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  wamatas_access_token TEXT,
  wamatas_instance_id TEXT,
  last_test_sent_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

DROP TRIGGER IF EXISTS church_whatsapp_config_set_updated_at ON church_whatsapp_config;
CREATE TRIGGER church_whatsapp_config_set_updated_at
  BEFORE UPDATE ON church_whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE church_whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_config_select" ON church_whatsapp_config;
CREATE POLICY "whatsapp_config_select" ON church_whatsapp_config FOR SELECT
  USING (church_id = get_my_church_id() AND has_admin_rights());

DROP POLICY IF EXISTS "whatsapp_config_insert" ON church_whatsapp_config;
CREATE POLICY "whatsapp_config_insert" ON church_whatsapp_config FOR INSERT
  WITH CHECK (church_id = get_my_church_id() AND is_owner());

DROP POLICY IF EXISTS "whatsapp_config_update" ON church_whatsapp_config;
CREATE POLICY "whatsapp_config_update" ON church_whatsapp_config FOR UPDATE
  USING (church_id = get_my_church_id() AND is_owner());

DROP POLICY IF EXISTS "whatsapp_config_delete" ON church_whatsapp_config;
CREATE POLICY "whatsapp_config_delete" ON church_whatsapp_config FOR DELETE
  USING (church_id = get_my_church_id() AND is_owner());

COMMENT ON COLUMN church_whatsapp_config.wamatas_access_token IS
  'Secret. Read server-side only, for sending. Never selected into a payload that reaches a browser — the UI shows the last 4 characters, derived on the server.';
COMMENT ON COLUMN church_whatsapp_config.is_enabled IS
  'Only ever set TRUE by a successful test send. Credentials being present is not evidence they work.';

-- ---------------------------------------------------------------------------
-- whatsapp_send_log — what was sent, to whom, and whether it landed.
--
-- Append-only by design: there is no UPDATE or DELETE policy, so a record of a
-- message cannot be quietly revised after the fact. Writes come from the
-- service role inside server actions, which is why there is no INSERT policy
-- either — the service role bypasses RLS, and no authenticated client should
-- be able to forge a send record.
--
-- message_preview is truncated rather than full: this is an operational log
-- for "did it go out", not an archive of what was said to each volunteer.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  purpose TEXT NOT NULL,
  phone TEXT NOT NULL,
  message_preview TEXT,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_send_log_church_idx
  ON whatsapp_send_log(church_id, created_at DESC);

ALTER TABLE whatsapp_send_log ENABLE ROW LEVEL SECURITY;

-- Read-only for admins. No INSERT/UPDATE/DELETE policy at all, which is what
-- makes the log append-only from every authenticated client's point of view.
DROP POLICY IF EXISTS "whatsapp_log_select" ON whatsapp_send_log;
CREATE POLICY "whatsapp_log_select" ON whatsapp_send_log FOR SELECT
  USING (church_id = get_my_church_id() AND has_admin_rights());

COMMENT ON TABLE whatsapp_send_log IS
  'Append-only delivery log. Written by the service role inside server actions; no client-facing INSERT policy exists, so a send record cannot be forged or revised.';
