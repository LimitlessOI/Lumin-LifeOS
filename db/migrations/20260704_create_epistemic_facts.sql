-- SYNOPSIS: Database migration — 20260704_create_epistemic_facts.sql.
-- MI-P1-001: epistemic_facts table
-- Purpose: store facts with metadata for Memory Intelligence

CREATE TABLE IF NOT EXISTS epistemic_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  domain TEXT NOT NULL,
  level INT NOT NULL,
  context_required TEXT,
  false_when TEXT,
  disproof_recipe TEXT,
  trial_count INT,
  adversarial_count INT,
  exception_count INT,
  source_count INT,
  last_tested_at TIMESTAMPTZ,
  decay_rate NUMERIC(3,2),
  review_by TIMESTAMPTZ,
  visibility_class TEXT,
  canonical_id UUID,
  residue_risk JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epistemic_facts_domain ON epistemic_facts(domain);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_level ON epistemic_facts(level);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_created_by ON epistemic_facts(created_by);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_review_by ON epistemic_facts(review_by);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_canonical_id ON epistemic_facts(canonical_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_last_tested_at ON epistemic_facts(last_tested_at);