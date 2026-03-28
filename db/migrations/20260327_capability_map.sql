-- Capability Map: stores analyzed competitor/industry ideas mapped to architecture
-- @ssot docs/projects/AMENDMENT_20_CAPABILITY_MAP.md

CREATE TABLE IF NOT EXISTS capability_map (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea          TEXT NOT NULL,
  source        TEXT,                          -- 'codex', 'user', 'competitor_scan', etc.
  mapping_type  TEXT CHECK (mapping_type IN ('existing_module', 'extension_point', 'new_segment')) NOT NULL,
  target        TEXT NOT NULL,                 -- amendment slug, file path, or segment name
  rationale     TEXT,
  suggested_segment JSONB,                     -- ready-to-insert segment spec if mapping_type=new_segment
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'inserted')),
  segment_id    UUID REFERENCES project_segments(id) ON DELETE SET NULL, -- set when inserted
  reviewed_by   TEXT DEFAULT 'pending',
  analyzed_at   TIMESTAMPTZ DEFAULT NOW(),
  acted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_capability_map_status ON capability_map(status);
CREATE INDEX IF NOT EXISTS idx_capability_map_mapping_type ON capability_map(mapping_type);
CREATE INDEX IF NOT EXISTS idx_capability_map_analyzed_at ON capability_map(analyzed_at DESC);
