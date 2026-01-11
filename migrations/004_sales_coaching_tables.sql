-- ╔══════════════════════════════════════════════════════════════════════════════════╗
-- ║              SALES COACHING & CALL RECORDING TABLES                             ║
-- ║              For BoldTrail Real Estate Sales Coaching System                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════════╝

-- Table 1: Sales Call Recordings
CREATE TABLE IF NOT EXISTS sales_call_recordings (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
  call_id VARCHAR(255) UNIQUE NOT NULL,
  recording_url TEXT,
  transcript TEXT,
  duration INTEGER, -- in seconds
  call_type VARCHAR(50) DEFAULT 'phone_call', -- or 'showing_presentation', 'client_meeting'
  client_name VARCHAR(255),
  client_phone VARCHAR(50),
  overall_score DECIMAL(3,1), -- 0.0 - 10.0
  analysis_complete BOOLEAN DEFAULT FALSE,
  ai_analysis JSONB, -- Full AI analysis results
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_calls_agent ON sales_call_recordings(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_calls_created ON sales_call_recordings(created_at DESC);

-- Table 2: Coaching Clips (Good moments and coaching needed)
CREATE TABLE IF NOT EXISTS coaching_clips (
  id SERIAL PRIMARY KEY,
  recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE CASCADE,
  agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
  clip_type VARCHAR(50) NOT NULL, -- 'good_moment' or 'coaching_needed'
  start_time INTEGER NOT NULL, -- seconds from start of call
  end_time INTEGER NOT NULL,
  transcript_segment TEXT,
  technique_detected VARCHAR(255), -- e.g., 'Interrupting Client', 'Great Rapport Building'
  severity VARCHAR(20), -- 'low', 'medium', 'high' (for coaching_needed clips)
  ai_analysis JSONB, -- Detailed analysis of this clip
  coaching_suggestion TEXT, -- What to improve or reinforce
  notes TEXT, -- Agent or manager notes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coaching_clips_agent ON coaching_clips(agent_id);
CREATE INDEX IF NOT EXISTS idx_coaching_clips_type ON coaching_clips(clip_type);
CREATE INDEX IF NOT EXISTS idx_coaching_clips_recording ON coaching_clips(recording_id);

-- Table 3: Sales Technique Patterns (Track bad habits over time)
CREATE TABLE IF NOT EXISTS sales_technique_patterns (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
  technique_name VARCHAR(255) NOT NULL, -- e.g., 'Interrupting Client', 'Talking Too Much'
  pattern_type VARCHAR(50) NOT NULL, -- 'bad_habit' or 'good_practice'
  frequency INTEGER DEFAULT 1, -- How many times detected
  last_detected TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, technique_name, pattern_type)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_technique_patterns_agent ON sales_technique_patterns(agent_id);
CREATE INDEX IF NOT EXISTS idx_technique_patterns_type ON sales_technique_patterns(pattern_type);

-- Table 4: Coaching Sessions (When manager reviews clips with agent)
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  clips_reviewed INTEGER[], -- Array of coaching_clip ids
  techniques_discussed TEXT[], -- Array of technique names
  action_items TEXT[], -- What agent will work on
  manager_notes TEXT,
  agent_notes TEXT,
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_agent ON coaching_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_date ON coaching_sessions(session_date DESC);

-- Table 5: Self-Programming Enhancement Logs
CREATE TABLE IF NOT EXISTS self_programming_enhancements (
  id SERIAL PRIMARY KEY,
  enhancement_name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'code_review', 'testing', 'security', etc.
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'disabled', 'testing'
  version VARCHAR(20),
  metrics JSONB, -- Performance metrics, usage stats
  config JSONB, -- Configuration parameters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_self_prog_status ON self_programming_enhancements(status);
CREATE INDEX IF NOT EXISTS idx_self_prog_category ON self_programming_enhancements(category);

-- Table 6: Code Review History (from Multi-Model Code Review system)
CREATE TABLE IF NOT EXISTS code_review_history (
  id SERIAL PRIMARY KEY,
  code_snippet TEXT,
  file_path VARCHAR(500),
  overall_score DECIMAL(3,1),
  approved BOOLEAN,
  reviewers JSONB, -- Array of reviewer results
  critical_issues TEXT[],
  recommendations TEXT[],
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_code_reviews_date ON code_review_history(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_reviews_approved ON code_review_history(approved);

-- Grant permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lifeos_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lifeos_user;

-- Sample data for testing (optional - comment out for production)
-- INSERT INTO sales_technique_patterns (agent_id, technique_name, pattern_type, frequency)
-- VALUES (1, 'Interrupting Client', 'bad_habit', 5),
--        (1, 'Not Listening', 'bad_habit', 3),
--        (1, 'Great Rapport Building', 'good_practice', 10);
