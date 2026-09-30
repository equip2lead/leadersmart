-- Keep the provider's own answer alongside our interpretation of it.
--
-- The adapter recorded provider_message_id = 'unknown' for every successful
-- send, because Wamatas replied with a success flag and no id in any field the
-- adapter knew to read. There was no way to tell whether the id was absent or
-- merely somewhere unexpected, since nothing kept the response.
--
-- This column is the answer to that class of question generally: when our
-- reading of a provider disagrees with reality, the raw body is the only
-- evidence that settles it. It is written on success and on failure alike —
-- a rejection body is just as diagnostic as an acceptance.
--
-- JSONB rather than TEXT so the field that actually holds the message id can
-- be found with a query rather than by eye:
--   SELECT DISTINCT jsonb_object_keys(raw_response) FROM whatsapp_send_log;

ALTER TABLE whatsapp_send_log
  ADD COLUMN IF NOT EXISTS raw_response JSONB;

COMMENT ON COLUMN whatsapp_send_log.raw_response IS
  'The provider''s unmodified response body. Kept so a disagreement between what we recorded and what actually happened can be settled from evidence rather than guesswork.';
