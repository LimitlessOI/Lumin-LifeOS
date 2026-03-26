-- @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
-- Generic external-sync reference map for TC -> Asana and future systems.

CREATE TABLE IF NOT EXISTS tc_external_refs (
  id                BIGSERIAL PRIMARY KEY,
  transaction_id    BIGINT NOT NULL REFERENCES tc_transactions(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  local_entity_type TEXT NOT NULL,
  local_entity_id   TEXT NOT NULL,
  external_id       TEXT NOT NULL,
  external_url      TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, entity_type, local_entity_type, local_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tc_external_refs_tx_provider ON tc_external_refs (transaction_id, provider);

DROP TRIGGER IF EXISTS trg_tc_external_refs_updated_at ON tc_external_refs;
CREATE TRIGGER trg_tc_external_refs_updated_at
  BEFORE UPDATE ON tc_external_refs
  FOR EACH ROW EXECUTE FUNCTION update_tc_updated_at();
