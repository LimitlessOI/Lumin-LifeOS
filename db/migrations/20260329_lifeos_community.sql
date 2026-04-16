-- Migration: 20260329_lifeos_community
-- LifeOS Module A (Health Extensions) + Module B (Purpose & Legacy) + Module C (Community & Meta)
-- Ideas 16–25: Food as Medicine, Pre-Disease, Monetization, Legacy, Death Meditation,
--              Flourishing Network, Group Coaching, Accountability Partnerships, Life Reviews,
--              Sovereign Mentor

BEGIN;

-- ── MODULE A: HEALTH EXTENSIONS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS food_insights (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  food_pattern     TEXT,
  observed_correlation TEXT,
  recommendation   TEXT,
  evidence_quality TEXT NOT NULL DEFAULT 'observational',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_insights_user ON food_insights(user_id);

CREATE TABLE IF NOT EXISTS health_warnings (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  warning_type         TEXT,
  pattern_description  TEXT,
  historical_match     TEXT,
  recommended_actions  TEXT[],
  urgency              TEXT NOT NULL DEFAULT 'moderate',
  resolved             BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_warnings_user ON health_warnings(user_id);

-- ── MODULE B: PURPOSE & LEGACY ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_paths (
  id                      BIGSERIAL PRIMARY KEY,
  user_id                 BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  path_title              TEXT,
  description             TEXT,
  first_90_days           TEXT,
  estimated_monthly_income TEXT,
  required_skills         TEXT[],
  confidence              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_monetization_paths_user ON monetization_paths(user_id);

CREATE TABLE IF NOT EXISTS legacy_projects (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  why_it_matters  TEXT,
  impact_vision   TEXT,
  milestones      JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  progress_pct    NUMERIC(4,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legacy_projects_user ON legacy_projects(user_id);

CREATE TABLE IF NOT EXISTS death_meditation_sessions (
  id                       BIGSERIAL PRIMARY KEY,
  user_id                  BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  prompt_used              TEXT,
  user_reflection          TEXT,
  commitments_that_matter  TEXT[],
  what_would_be_said       TEXT,
  insights                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_death_meditation_user ON death_meditation_sessions(user_id);

-- ── MODULE C: COMMUNITY & META ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flourishing_contributions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  consent_granted  BOOLEAN NOT NULL DEFAULT FALSE,
  data_snapshot    JSONB,
  contributed_at   TIMESTAMPTZ,
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_flourishing_contributions_user ON flourishing_contributions(user_id);

CREATE TABLE IF NOT EXISTS group_coaching_rooms (
  id          BIGSERIAL PRIMARY KEY,
  room_code   TEXT UNIQUE NOT NULL,
  name        TEXT,
  created_by  BIGINT REFERENCES lifeos_users(id) ON DELETE SET NULL,
  members     JSONB NOT NULL DEFAULT '[]',
  session_log JSONB NOT NULL DEFAULT '[]',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_group_coaching_rooms_code ON group_coaching_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_group_coaching_rooms_creator ON group_coaching_rooms(created_by);

CREATE TABLE IF NOT EXISTS accountability_partnerships (
  id            BIGSERIAL PRIMARY KEY,
  user_a        BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  user_b        BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  focus_area_a  TEXT,
  focus_area_b  TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  check_in_log  JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accountability_partnerships_a ON accountability_partnerships(user_a);
CREATE INDEX IF NOT EXISTS idx_accountability_partnerships_b ON accountability_partnerships(user_b);

CREATE TABLE IF NOT EXISTS life_reviews (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  quarter            TEXT NOT NULL,
  who_i_became       TEXT,
  surprised_by       TEXT,
  avoiding           TEXT,
  most_proud         TEXT,
  want_true_next     TEXT,
  full_conversation  JSONB NOT NULL DEFAULT '[]',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_life_reviews_user ON life_reviews(user_id);

CREATE TABLE IF NOT EXISTS sovereign_mentor_sessions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  years_of_data   NUMERIC(5,2),
  what_they_see   TEXT,
  user_response   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sovereign_mentor_user ON sovereign_mentor_sessions(user_id);

COMMIT;
