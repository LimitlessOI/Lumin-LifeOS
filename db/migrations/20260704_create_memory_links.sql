-- SYNOPSIS: Database migration — 20260704_create_memory_links.sql.
-- Create associative memory links table
CREATE TABLE IF NOT EXISTS memory_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common memory link lookups
CREATE INDEX IF NOT EXISTS idx_memory_links_owner_id ON memory_links(owner_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_source_id ON memory_links(source_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_target_id ON memory_links(target_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_link_type ON memory_links(link_type);
CREATE INDEX IF NOT EXISTS idx_memory_links_owner_link_type ON memory_links(owner_id, link_type);