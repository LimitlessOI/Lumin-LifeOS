-- SYNOPSIS: Database migration — 20260529_builderos_tsos_routing_g3_2_comparator.sql.
-- TSOS-G3.2 — baseline comparator snapshot column (shadow observability only).

BEGIN;

ALTER TABLE builderos_tsos_routing_decisions
  ADD COLUMN IF NOT EXISTS comparator_snapshot_json JSONB;

COMMIT;
