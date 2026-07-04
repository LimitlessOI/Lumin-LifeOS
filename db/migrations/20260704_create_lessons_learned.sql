-- SYNOPSIS: Database migration — 20260704_create_lessons_learned.sql.
CREATE TABLE IF NOT EXISTS lessons_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  impact_class TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  how_novel TEXT,
  surfaced_by UUID NOT NULL,
  retrieval_count INT,
  write_cost_tokens INT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_learned_domain ON lessons_learned (domain);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_impact_class ON lessons_learned (impact_class);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_surfaced_by ON lessons_learned (surfaced_by);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_created_at ON lessons_learned (created_at);