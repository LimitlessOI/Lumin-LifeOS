-- SYNOPSIS: Database migration — 20260629_lifere_sales_coaching.sql
-- LifeRE Sales Coaching Phase 1: simulator sessions, objection attempts, call scores

CREATE TABLE IF NOT EXISTS lifere_coaching_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     TEXT NOT NULL,
  scenario_id  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  quadrant     TEXT,                        -- analytical | driver | expressive | amiable (detected)
  turns        JSONB NOT NULL DEFAULT '[]', -- [{role:'agent'|'client'|'coach', text, ts}]
  scores       JSONB,                       -- {talk_ratio, question_count, close_attempts, objections_handled, objections_failed, overall}
  debrief      JSONB,                       -- AI post-session analysis
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lifere_objection_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES lifere_coaching_sessions(id),
  owner_id        TEXT NOT NULL,
  objection_id    TEXT NOT NULL,
  agent_response  TEXT,
  outcome         TEXT,  -- handled | failed | partial
  coach_feedback  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifere_coaching_sessions_owner ON lifere_coaching_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_lifere_coaching_sessions_status ON lifere_coaching_sessions (status);
CREATE INDEX IF NOT EXISTS idx_lifere_objection_attempts_session ON lifere_objection_attempts (session_id);
CREATE INDEX IF NOT EXISTS idx_lifere_objection_attempts_owner ON lifere_objection_attempts (owner_id);
