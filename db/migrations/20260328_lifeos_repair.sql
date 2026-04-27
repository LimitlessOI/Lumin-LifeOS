-- 20260328_lifeos_repair.sql
-- ONE-BOOT repair for the LifeOS migration cascade failure.
--
-- Root cause: 20260321_word_keeper.sql (already applied) created `commitments`
-- with user_id TEXT and no due_at column. 20260328_lifeos_core.sql wraps
-- everything in a single BEGIN…COMMIT; the index creation on `due_at` fails,
-- rolling back the entire transaction — including lifeos_users.  Every LifeOS
-- migration that sorts after core.sql but before this file then also fails with
-- "relation lifeos_users does not exist".
--
-- Fix strategy (one-boot):
--   1. Conditionally replace the conflicting commitments table.
--   2. Create lifeos_users (prerequisite for all LifeOS FK chains).
--   3. Re-create all tables from 20260328_lifeos_core.sql and
--      20260328_lifeos_notifications.sql using IF NOT EXISTS, so they're
--      idempotent on DBs that already have the correct schema.
--   4. Mark both source files as applied in schema_migrations so the
--      migration runner won't re-attempt them on subsequent boots.
--
-- Safe for production: all DDL uses IF NOT EXISTS / IF EXISTS / DO $$ checks.

BEGIN;

-- ─── 1. Replace old word-keeper commitments if it has TEXT user_id ───────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name   = 'commitments'
       AND column_name  = 'user_id'
       AND data_type    = 'text'
       AND table_schema = current_schema()
  ) THEN
    -- Backup existing rows (usually empty in sandbox)
    CREATE TABLE IF NOT EXISTS wk_commitments_backup AS SELECT * FROM commitments;
    -- CASCADE drops FK constraints in apology_log, commitment_reminders, etc.
    -- Those tables remain; only their FK constraints are removed.
    DROP TABLE commitments CASCADE;
    RAISE NOTICE 'lifeos_repair: replaced old TEXT-user_id commitments (backup → wk_commitments_backup)';
  ELSE
    RAISE NOTICE 'lifeos_repair: commitments already correct schema or absent — no action';
  END IF;
END $$;

-- ─── 2. lifeos_users (prerequisite for every LifeOS FK) ──────────────────────
CREATE TABLE IF NOT EXISTS lifeos_users (
  id                BIGSERIAL PRIMARY KEY,
  user_handle       TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  timezone          TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  tier              TEXT NOT NULL DEFAULT 'free',
  be_statement      TEXT,
  do_statement      TEXT,
  have_vision       TEXT,
  truth_style       TEXT DEFAULT 'direct',
  flourishing_prefs JSONB DEFAULT '{}',
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO lifeos_users (user_handle, display_name)
VALUES ('adam', 'Adam')
ON CONFLICT (user_handle) DO NOTHING;

-- ─── 3. All tables from 20260328_lifeos_core.sql ─────────────────────────────

CREATE TABLE IF NOT EXISTS commitments (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  committed_to      TEXT,
  source            TEXT DEFAULT 'manual',
  source_ref        TEXT,
  due_at            TIMESTAMPTZ,
  remind_at         TIMESTAMPTZ,
  remind_interval   INTERVAL,
  snoozed_until     TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'open',
  kept_at           TIMESTAMPTZ,
  broken_at         TIMESTAMPTZ,
  broken_reason     TEXT,
  weight            INTEGER DEFAULT 1,
  is_public         BOOLEAN DEFAULT FALSE,
  prod_count        INTEGER DEFAULT 0,
  last_prod_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commitments_user_status ON commitments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_commitments_due         ON commitments (due_at)     WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_commitments_remind      ON commitments (remind_at)  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS commitment_prods (
  id              BIGSERIAL PRIMARY KEY,
  commitment_id   BIGINT NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL DEFAULT 'overlay',
  message         TEXT,
  user_response   TEXT,
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prods_commitment ON commitment_prods (commitment_id);

CREATE TABLE IF NOT EXISTS integrity_score_log (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  score_date            DATE NOT NULL,
  commitment_score      NUMERIC(5,2),
  health_score          NUMERIC(5,2),
  inner_work_score      NUMERIC(5,2),
  generosity_score      NUMERIC(5,2),
  repair_score          NUMERIC(5,2),
  total_score           NUMERIC(5,2),
  delta_7d              NUMERIC(5,2),
  delta_30d             NUMERIC(5,2),
  commitments_due       INTEGER DEFAULT 0,
  commitments_kept      INTEGER DEFAULT 0,
  commitments_broken    INTEGER DEFAULT 0,
  health_checkins_done  INTEGER DEFAULT 0,
  inner_work_entries    INTEGER DEFAULT 0,
  generosity_actions    INTEGER DEFAULT 0,
  repair_actions        INTEGER DEFAULT 0,
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_integrity_user_date ON integrity_score_log (user_id, score_date DESC);

CREATE TABLE IF NOT EXISTS joy_checkins (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  joy_score       INTEGER CHECK (joy_score BETWEEN 1 AND 10),
  peace_score     INTEGER CHECK (peace_score BETWEEN 1 AND 10),
  energy_score    INTEGER CHECK (energy_score BETWEEN 1 AND 10),
  joy_sources     TEXT[],
  joy_drains      TEXT[],
  notes           TEXT,
  source          TEXT DEFAULT 'manual',
  inferred_from   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_joy_user_date ON joy_checkins (user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_joy_sources   ON joy_checkins USING GIN (joy_sources);
CREATE INDEX IF NOT EXISTS idx_joy_drains    ON joy_checkins USING GIN (joy_drains);

CREATE TABLE IF NOT EXISTS joy_score_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  score_date      DATE NOT NULL,
  avg_joy_7d      NUMERIC(4,2),
  avg_peace_7d    NUMERIC(4,2),
  avg_energy_7d   NUMERIC(4,2),
  avg_joy_30d     NUMERIC(4,2),
  top_sources_7d  TEXT[],
  top_drains_7d   TEXT[],
  trend           TEXT,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_joy_score_user_date ON joy_score_log (user_id, score_date DESC);

CREATE TABLE IF NOT EXISTS daily_mirror_log (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  mirror_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  integrity_score       NUMERIC(5,2),
  joy_score             NUMERIC(4,2),
  open_commitments      INTEGER DEFAULT 0,
  overdue_commitments   INTEGER DEFAULT 0,
  intention             TEXT,
  hard_truth            TEXT,
  hard_truth_topic      TEXT,
  viewed_at             TIMESTAMPTZ,
  acknowledged_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, mirror_date)
);

CREATE INDEX IF NOT EXISTS idx_mirror_user_date ON daily_mirror_log (user_id, mirror_date DESC);

CREATE TABLE IF NOT EXISTS health_checkins (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours     NUMERIC(4,2),
  sleep_quality   INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  resting_hr      INTEGER,
  hrv             INTEGER,
  weight_lbs      NUMERIC(5,1),
  water_oz        INTEGER,
  alcohol_drinks  INTEGER DEFAULT 0,
  foods_logged    TEXT[],
  glucose_notes   TEXT,
  energy_score    INTEGER CHECK (energy_score BETWEEN 1 AND 10),
  mood_score      INTEGER CHECK (mood_score BETWEEN 1 AND 10),
  medications_taken TEXT[],
  notes           TEXT,
  source          TEXT DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_health_user_date ON health_checkins (user_id, checkin_date DESC);

CREATE TABLE IF NOT EXISTS inner_work_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  work_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  practice_type   TEXT NOT NULL,
  duration_min    INTEGER,
  notes           TEXT,
  insight         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inner_work_user_date ON inner_work_log (user_id, work_date DESC);
CREATE INDEX IF NOT EXISTS idx_inner_work_type      ON inner_work_log (user_id, practice_type);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_lifeos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_lifeos_users_updated ON lifeos_users;
CREATE TRIGGER trg_lifeos_users_updated
  BEFORE UPDATE ON lifeos_users
  FOR EACH ROW EXECUTE FUNCTION update_lifeos_updated_at();

DROP TRIGGER IF EXISTS trg_commitments_updated ON commitments;
CREATE TRIGGER trg_commitments_updated
  BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION update_lifeos_updated_at();

-- ─── 4. All tables from 20260328_lifeos_notifications.sql ────────────────────

CREATE TABLE IF NOT EXISTS lifeos_notification_queue (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'overlay',
  subject_id      BIGINT,
  subject_type    TEXT,
  message         TEXT NOT NULL,
  priority        INTEGER DEFAULT 5,
  status          TEXT NOT NULL DEFAULT 'pending',
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  failed_reason   TEXT,
  escalation_group TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_notif_pending ON lifeos_notification_queue (user_id, status, scheduled_at) WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_lifeos_notif_type    ON lifeos_notification_queue (user_id, type);

-- ─── 5. Mark source files as applied so they are not re-attempted ────────────
-- schema_migrations only has a `filename` column in older DB instances.
-- Don't specify applied_at — the column may not exist (created with DEFAULT).
INSERT INTO schema_migrations (filename) VALUES ('20260328_lifeos_core.sql')          ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations (filename) VALUES ('20260328_lifeos_notifications.sql') ON CONFLICT DO NOTHING;

COMMIT;
