-- SYNOPSIS: Database migration — 20260513_repair_phase1_syntax.sql.
-- Repair Phase 1: Syntax-broken migrations
-- Fixes for 2 migrations that failed due to code-level SQL errors:
--   (1) 20260427_lifeos_conflict_interrupts.sql — markdown ---METADATA--- block at EOF
--       was parsed as SQL by PostgreSQL; also used wrong FK table (users vs lifeos_users)
--   (2) 20260427_lifeos_sleep_logs.sql — ::INT cast inside GENERATED ALWAYS AS
--       is invalid PostgreSQL syntax (pg disallows :: inside generated column expressions)
--
-- Both originals are permanently marked "applied" in schema_migrations (failed path still
-- marks applied). This migration recreates the intended tables with IF NOT EXISTS guards.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. conflict_interrupts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conflict_interrupts (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  partner_id       BIGINT REFERENCES lifeos_users(id) ON DELETE SET NULL,
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_source   TEXT NOT NULL CHECK (trigger_source IN ('manual', 'keyword_detection', 'tone_detection', 'escalation')),
  conflict_context TEXT,
  interrupt_type   TEXT NOT NULL CHECK (interrupt_type IN ('pause', 'reframe', 'exit', 'notify_partner')),
  resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'escalated', 'abandoned')),
  resolved_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conflict_interrupts_user_triggered
  ON conflict_interrupts(user_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_conflict_interrupts_partner
  ON conflict_interrupts(partner_id, triggered_at DESC)
  WHERE partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conflict_interrupts_resolution
  ON conflict_interrupts(resolution_status, triggered_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. sleep_logs — fix: CAST(... AS INTEGER) instead of ::INT in generated column
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sleep_logs (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  sleep_start      TIMESTAMPTZ NOT NULL,
  sleep_end        TIMESTAMPTZ NOT NULL,
  duration_minutes INT GENERATED ALWAYS AS (
    CAST(EXTRACT(EPOCH FROM (sleep_end - sleep_start)) / 60 AS INTEGER)
  ) STORED,
  quality          SMALLINT CHECK (quality BETWEEN 1 AND 10),
  source           VARCHAR(32) NOT NULL DEFAULT 'manual',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_start
  ON sleep_logs(user_id, sleep_start DESC);
