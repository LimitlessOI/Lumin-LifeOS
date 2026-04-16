BEGIN;

CREATE TABLE IF NOT EXISTS communication_profiles (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE UNIQUE,

  -- Learned style preferences (0.0-1.0 weight per option, updated as engagement data comes in)
  opening_weights   JSONB NOT NULL DEFAULT '{}',   -- { "question": 0.8, "observation": 0.3, ... }
  length_weights    JSONB NOT NULL DEFAULT '{}',
  tone_weights      JSONB NOT NULL DEFAULT '{}',
  question_weights  JSONB NOT NULL DEFAULT '{}',

  -- Contextual sensitivities (learned from health + score correlations)
  low_sleep_threshold    INTEGER DEFAULT 360,   -- minutes below which → use flooded approach
  low_hrv_threshold      INTEGER DEFAULT 40,    -- HRV below this → soft entry only
  low_joy_threshold      NUMERIC(4,2) DEFAULT 4.0,  -- joy score below this → more gentle
  low_integrity_threshold NUMERIC(4,2) DEFAULT 50.0, -- integrity below this → sensitive around accountability

  -- Phrase learning (what feels real vs. scripted to this person)
  phrases_that_land     TEXT[] DEFAULT '{}',   -- phrases that correlate with continued engagement
  phrases_to_avoid      TEXT[] DEFAULT '{}',   -- phrases that correlate with session end or short responses

  -- Time patterns
  best_hours            INTEGER[] DEFAULT '{}',   -- hours of day with highest engagement (0-23)
  difficult_hours       INTEGER[] DEFAULT '{}',   -- hours of day with lowest engagement

  -- Summary (AI-generated, refreshed periodically)
  profile_summary       TEXT,   -- "Adam responds best to direct morning communication when well-rested. Avoid questions when he's tired or in a low-integrity period..."
  last_summary_at       TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communication_engagements (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_id      BIGINT,   -- coaching session or null
  context         TEXT NOT NULL,   -- 'coaching'|'truth_delivery'|'commitment_prod'|'mediation'

  -- The styles used
  opening_style   TEXT,
  length_style    TEXT,
  tone_register   TEXT,
  question_ending TEXT,

  -- The context at time of delivery
  joy_score_at_time       NUMERIC(4,2),
  integrity_score_at_time NUMERIC(4,2),
  sleep_minutes_last_night INTEGER,
  hrv_at_time             INTEGER,
  hour_of_day             INTEGER,

  -- Engagement signal (did this land?)
  engagement_signal TEXT,  -- 'acknowledged'|'continued'|'session_ended_early'|'ignored'|'reengaged'
  response_length   INTEGER,  -- how many words the user sent back (longer = more engaged)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_profile_user ON communication_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_engagements_user ON communication_engagements(user_id, created_at DESC);

-- updated_at trigger for communication_profiles
CREATE OR REPLACE FUNCTION update_comm_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_comm_profile_updated ON communication_profiles;
CREATE TRIGGER trg_comm_profile_updated
  BEFORE UPDATE ON communication_profiles
  FOR EACH ROW EXECUTE FUNCTION update_comm_profile_updated_at();

COMMIT;
