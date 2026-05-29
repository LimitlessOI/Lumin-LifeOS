-- TSOS-G3.2 — baseline comparator snapshot column (shadow observability only).

BEGIN;

ALTER TABLE builderos_tsos_routing_decisions
  ADD COLUMN IF NOT EXISTS comparator_snapshot_json JSONB;

COMMIT;
