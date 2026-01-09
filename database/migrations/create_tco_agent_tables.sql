-- ╔══════════════════════════════════════════════════════════════════════════════════╗
-- ║                    TCO AI SALES AGENT TABLES (TCO-F01)                           ║
-- ║         Autonomous agent for detecting and responding to cost complaints         ║
-- ╚══════════════════════════════════════════════════════════════════════════════════╝

-- TCO Agent Interactions table
-- Logs all agent interactions for human review and follow-up
CREATE TABLE IF NOT EXISTS tco_agent_interactions (
  id BIGSERIAL PRIMARY KEY,

  -- Source information
  source_platform VARCHAR(50) NOT NULL, -- 'twitter', 'linkedin', 'reddit', 'email', etc.
  source_id VARCHAR(255), -- Platform-specific ID (tweet_id, post_id, etc.)
  source_url TEXT, -- Link to original post/message

  -- Content
  original_message TEXT NOT NULL, -- The complaint/mention we detected
  author_username VARCHAR(255), -- Username of the person
  author_profile_url TEXT, -- Link to their profile

  -- Detection
  detected_at TIMESTAMP DEFAULT NOW(),
  cost_complaint_detected BOOLEAN DEFAULT FALSE, -- Did we detect a cost complaint?
  confidence_score DECIMAL(5, 2), -- 0-100 confidence in detection
  keywords_matched TEXT[], -- Array of keywords that triggered detection

  -- Response
  agent_response TEXT, -- What the agent wants to say
  response_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'sent'
  response_sent_at TIMESTAMP,

  -- Follow-up
  follow_up_scheduled BOOLEAN DEFAULT FALSE,
  follow_up_at TIMESTAMP, -- When to follow up (24 hours later)
  follow_up_sent BOOLEAN DEFAULT FALSE,
  follow_up_sent_at TIMESTAMP,
  follow_up_response TEXT, -- The follow-up message

  -- Lead tracking
  became_lead BOOLEAN DEFAULT FALSE, -- Did they respond?
  lead_email VARCHAR(255), -- If they provided email
  lead_converted BOOLEAN DEFAULT FALSE, -- Did they sign up?
  customer_id INTEGER REFERENCES tco_customers(id), -- If they became a customer

  -- Human review
  human_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  review_notes TEXT,

  -- Metadata
  metadata JSONB, -- Additional data (full webhook payload, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tco_agent_source ON tco_agent_interactions(source_platform, source_id);
CREATE INDEX IF NOT EXISTS idx_tco_agent_status ON tco_agent_interactions(response_status);
CREATE INDEX IF NOT EXISTS idx_tco_agent_follow_up ON tco_agent_interactions(follow_up_scheduled, follow_up_at)
  WHERE follow_up_scheduled = TRUE AND follow_up_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_tco_agent_leads ON tco_agent_interactions(became_lead) WHERE became_lead = TRUE;
CREATE INDEX IF NOT EXISTS idx_tco_agent_created ON tco_agent_interactions(created_at DESC);

-- TCO Agent Config table
-- Settings for agent behavior (rate limits, keywords, etc.)
CREATE TABLE IF NOT EXISTS tco_agent_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default config
INSERT INTO tco_agent_config (config_key, config_value, description) VALUES
  ('enabled', '"true"', 'Enable/disable the sales agent'),
  ('auto_reply', '"false"', 'Automatically send replies (true) or require human approval (false)'),
  ('follow_up_enabled', '"true"', 'Enable 24-hour follow-ups'),
  ('follow_up_delay_hours', '24', 'Hours to wait before follow-up'),
  ('rate_limit_per_hour', '10', 'Max replies per hour to avoid spam'),
  ('confidence_threshold', '70', 'Minimum confidence score (0-100) to trigger response'),
  ('keywords', '["api costs", "openai expensive", "anthropic pricing", "ai costs", "gpt-4 pricing", "claude pricing", "spending too much", "cost reduction", "cheaper alternative", "save money on ai"]', 'Keywords that trigger cost complaint detection'),
  ('blocked_users', '[]', 'Usernames to ignore'),
  ('test_mode', '"true"', 'Log but don''t send (for testing)')
ON CONFLICT (config_key) DO NOTHING;

-- TCO Agent Stats table
-- Track agent performance metrics
CREATE TABLE IF NOT EXISTS tco_agent_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,

  mentions_received INTEGER DEFAULT 0,
  complaints_detected INTEGER DEFAULT 0,
  responses_sent INTEGER DEFAULT 0,
  follow_ups_sent INTEGER DEFAULT 0,

  leads_generated INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,

  avg_confidence_score DECIMAL(5, 2),
  avg_response_time_minutes INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Function to update stats
CREATE OR REPLACE FUNCTION update_tco_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update today's stats
  INSERT INTO tco_agent_stats (date, mentions_received)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) DO UPDATE
  SET mentions_received = tco_agent_stats.mentions_received + 1;

  -- If complaint detected, increment counter
  IF NEW.cost_complaint_detected THEN
    UPDATE tco_agent_stats
    SET complaints_detected = complaints_detected + 1
    WHERE date = CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
CREATE TRIGGER tco_agent_stats_trigger
  AFTER INSERT ON tco_agent_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_tco_agent_stats();

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_tco_agent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for interactions table
CREATE TRIGGER tco_agent_interaction_updated
  BEFORE UPDATE ON tco_agent_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_tco_agent_timestamp();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'TCO AI Sales Agent tables created successfully!';
  RAISE NOTICE 'Tables: tco_agent_interactions, tco_agent_config, tco_agent_stats';
  RAISE NOTICE 'Agent is in TEST MODE by default - set test_mode=false to go live';
  RAISE NOTICE 'Auto-reply is DISABLED by default - requires human approval';
END $$;
