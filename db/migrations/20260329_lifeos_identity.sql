-- db/migrations/20260329_lifeos_identity.sql
--
-- LifeOS Identity Intelligence Layer
-- Contradiction Engine, Belief Archaeology, Identity Stress Test, Honest Witness
--
-- Depends on: lifeos_users (from 20260328_lifeos_core.sql)

BEGIN;

-- ── contradiction_log ────────────────────────────────────────────────────────
-- Stores each gap detected between stated values and actual behavioral patterns.

CREATE TABLE IF NOT EXISTS contradiction_log (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  stated_value       TEXT NOT NULL,
  observed_pattern   TEXT NOT NULL,
  contradiction_score NUMERIC(4,2) CHECK (contradiction_score >= 0 AND contradiction_score <= 10),
  surfaced_at        TIMESTAMPTZ DEFAULT NOW(),
  acknowledged       BOOLEAN DEFAULT FALSE,
  acknowledged_at    TIMESTAMPTZ,
  user_response      TEXT
);

CREATE INDEX IF NOT EXISTS idx_contradiction_log_user_id
  ON contradiction_log(user_id);

CREATE INDEX IF NOT EXISTS idx_contradiction_log_user_acknowledged
  ON contradiction_log(user_id, acknowledged);

-- ── belief_patterns ──────────────────────────────────────────────────────────
-- Tracks the underlying limiting beliefs behind repeated behavioral failures.

CREATE TABLE IF NOT EXISTS belief_patterns (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  trigger_pattern   TEXT NOT NULL,
  belief_statement  TEXT NOT NULL,
  frequency         INTEGER DEFAULT 1,
  first_identified  TIMESTAMPTZ DEFAULT NOW(),
  last_seen         TIMESTAMPTZ DEFAULT NOW(),
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','examining','updated','resolved')),
  updated_belief    TEXT
);

CREATE INDEX IF NOT EXISTS idx_belief_patterns_user_id
  ON belief_patterns(user_id);

CREATE INDEX IF NOT EXISTS idx_belief_patterns_user_status
  ON belief_patterns(user_id, status);

-- ── identity_reviews ─────────────────────────────────────────────────────────
-- Quarterly stress-tests of stated Be/Do/Have identity against actual data.

CREATE TABLE IF NOT EXISTS identity_reviews (
  id                     BIGSERIAL PRIMARY KEY,
  user_id                BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  be_statement           TEXT,
  do_statement           TEXT,
  have_statement         TEXT,
  stress_test_results    JSONB,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_reviews_user_id
  ON identity_reviews(user_id);

-- ── honest_witness_sessions ──────────────────────────────────────────────────
-- Quarterly sessions where the AI reads back exactly what the data shows —
-- no coaching, no softening, no agenda.

CREATE TABLE IF NOT EXISTS honest_witness_sessions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  period_start     TIMESTAMPTZ,
  period_end       TIMESTAMPTZ,
  said_wanted      TEXT,
  what_happened    TEXT,
  gap_analysis     TEXT,
  user_reflection  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honest_witness_sessions_user_id
  ON honest_witness_sessions(user_id);

COMMIT;
