-- SYNOPSIS: Database migration — 20260705_create_capability_map.sql.
-- Capability Map: store capability ideas and analyses
CREATE TABLE IF NOT EXISTS capability_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  idea TEXT NOT NULL,
  source TEXT NOT NULL,
  mapping_type TEXT NOT NULL,
  target TEXT NOT NULL,
  rationale TEXT NOT NULL,
  suggested_segment JSONB,
  status TEXT NOT NULL,
  segment_id UUID
);

CREATE INDEX IF NOT EXISTS idx_capability_map_owner_id ON capability_map(owner_id);
CREATE INDEX IF NOT EXISTS idx_capability_map_status ON capability_map(status);
CREATE INDEX IF NOT EXISTS idx_capability_map_segment_id ON capability_map(segment_id);