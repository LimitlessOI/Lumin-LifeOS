-- SYNOPSIS: Database migration — 20260513_repair_phase3_users_monetization.sql.
-- Repair Phase 3: users-chain FK fixes + monetization status column mismatch
--
-- Four migrations failed because they reference a "users" table that was renamed
-- to "lifeos_users" (BIGINT id) in the LifeOS domain, or referenced "clients"
-- or "decision_logs" tables that do not exist anywhere in the schema.
--
-- One migration failed because monetization_paths already existed on Railway
-- without the "status" column — the CREATE TABLE IF NOT EXISTS was skipped but
-- the index on (user_id, status) then failed with "column status does not exist."
--
-- This repair:
--   (1) assessment_results          — was users(INTEGER), now lifeos_users(BIGINT)
--   (2) decision_review_queue       — was users(INTEGER) + decision_logs FK; now
--                                     lifeos_users(BIGINT), decision_logs FK removed
--   (3) dashboard_widgets           — standalone, no FK change needed
--   (4) dashboard_preferences       — was users(INTEGER), now lifeos_users(BIGINT)
--   (5) client_metrics_cache        — was clients(INTEGER) FK; no clients table exists,
--                                     FK removed (client_id kept as plain INTEGER)
--   (6) monetization_paths status   — ADD COLUMN IF NOT EXISTS status

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. assessment_results
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_results (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  assessment_type  TEXT NOT NULL CHECK (assessment_type IN ('attachment_style', 'love_language', 'conflict_style', 'communication_style', 'personality_snapshot')),
  result_key       TEXT NOT NULL,
  result_label     TEXT NOT NULL,
  score            NUMERIC(5,2),
  raw_answers      JSONB,
  version          INTEGER NOT NULL DEFAULT 1,
  taken_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_results_user_type_version_unique UNIQUE (user_id, assessment_type, version)
);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_type
  ON assessment_results(user_id, assessment_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. decision_review_queue — decision_logs table does not exist anywhere; FK removed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decision_review_queue (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  decision_log_id  INTEGER,            -- was REFERENCES decision_logs(id); that table doesn't exist
  review_due_at    TIMESTAMPTZ NOT NULL,
  review_type      TEXT NOT NULL CHECK (review_type IN ('30_day', '90_day', '1_year')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  completed_at     TIMESTAMPTZ,
  hindsight_notes  TEXT,
  outcome_rating   INTEGER CHECK (outcome_rating BETWEEN 1 AND 5),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_review_queue_user_due
  ON decision_review_queue(user_id, review_due_at);
CREATE INDEX IF NOT EXISTS idx_decision_review_queue_user_status
  ON decision_review_queue(user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. dashboard_widgets — standalone, no FK issues
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  config     JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_name ON dashboard_widgets(name);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. dashboard_preferences — was users(INTEGER), now lifeos_users(BIGINT)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id          SERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id ON dashboard_preferences(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. client_metrics_cache — "clients" table doesn't exist; FK removed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_metrics_cache (
  id        SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,    -- was REFERENCES clients(id); no clients table exists
  metrics   JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_metrics_cache_client_id ON client_metrics_cache(client_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. monetization_paths status column + monetization_outreach
--
-- The original 20260418_lifeos_monetization.sql uses BEGIN/COMMIT. When it ran
-- on Railway, monetization_paths already existed (pre-existing row in schema_migrations)
-- but without the "status" column. Step 2 of the transaction —
--   CREATE INDEX ... ON monetization_paths (user_id, status)
-- — failed with "column status does not exist", which aborted the whole transaction.
-- This means monetization_outreach was also never created (it was step 3).
-- ─────────────────────────────────────────────────────────────────────────────

-- Add status to monetization_paths if it doesn't have it
ALTER TABLE monetization_paths
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Re-create the index now that status exists
DROP INDEX IF EXISTS idx_monetization_paths_user;
CREATE INDEX IF NOT EXISTS idx_monetization_paths_user ON monetization_paths (user_id, status);

-- monetization_outreach may not exist at all (transaction aborted before it was created)
CREATE TABLE IF NOT EXISTS monetization_outreach (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  path_id     BIGINT NOT NULL REFERENCES monetization_paths(id) ON DELETE CASCADE,
  task_type   TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  rationale   TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  approved_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  source      TEXT NOT NULL DEFAULT 'ai',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table existed without status, add the column
ALTER TABLE monetization_outreach
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

DROP INDEX IF EXISTS idx_monetization_outreach_user;
CREATE INDEX IF NOT EXISTS idx_monetization_outreach_user ON monetization_outreach (user_id, status);

CREATE INDEX IF NOT EXISTS idx_monetization_outreach_path ON monetization_outreach (path_id);
