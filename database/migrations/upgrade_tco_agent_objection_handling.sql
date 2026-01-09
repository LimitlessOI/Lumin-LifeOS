-- ╔══════════════════════════════════════════════════════════════════════════════════╗
-- ║           TCO AGENT UPGRADE - WORLD-CLASS OBJECTION HANDLING                    ║
-- ║   Add persistence tracking, objection detection, and negotiation logging         ║
-- ╚══════════════════════════════════════════════════════════════════════════════════╝

-- Add new fields to tco_agent_interactions table
ALTER TABLE tco_agent_interactions ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;
ALTER TABLE tco_agent_interactions ADD COLUMN IF NOT EXISTS objection_type VARCHAR(50);
ALTER TABLE tco_agent_interactions ADD COLUMN IF NOT EXISTS negotiated_rate DECIMAL(5, 4);

-- Create index for follow-up count (for persistence tracking)
CREATE INDEX IF NOT EXISTS idx_tco_agent_followup_count ON tco_agent_interactions(follow_up_count);

-- Create index for objection type (for analytics)
CREATE INDEX IF NOT EXISTS idx_tco_agent_objection_type ON tco_agent_interactions(objection_type);

-- ══════════════════════════════════════════════════════════════════════════════════
-- NEGOTIATION TRACKING TABLE
-- ══════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tco_agent_negotiations (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER, -- May or may not exist yet
  interaction_id INTEGER REFERENCES tco_agent_interactions(id),

  -- Negotiation details
  tier VARCHAR(50) NOT NULL, -- 'standard', 'beta_basic', 'beta_case_study', 'beta_enterprise_logo'
  rate DECIMAL(5, 4) NOT NULL, -- 0.20, 0.15, 0.10, 0.05
  conditions TEXT, -- What they agreed to

  -- Tracking
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tco_negotiations_customer ON tco_agent_negotiations(customer_id);
CREATE INDEX IF NOT EXISTS idx_tco_negotiations_tier ON tco_agent_negotiations(tier);
CREATE INDEX IF NOT EXISTS idx_tco_negotiations_created ON tco_agent_negotiations(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════════
-- UPDATE EXISTING DATA (set default follow_up_count to 0)
-- ══════════════════════════════════════════════════════════════════════════════════
UPDATE tco_agent_interactions
SET follow_up_count = 0
WHERE follow_up_count IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ TCO Agent upgraded with world-class objection handling!';
  RAISE NOTICE '   - Added follow_up_count tracking (3-strike persistence)';
  RAISE NOTICE '   - Added objection_type detection';
  RAISE NOTICE '   - Added negotiated_rate tracking';
  RAISE NOTICE '   - Created tco_agent_negotiations table';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Agent is now equipped to NEVER give up on qualified leads!';
END $$;
