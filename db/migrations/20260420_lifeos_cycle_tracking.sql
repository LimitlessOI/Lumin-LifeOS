-- Migration: 20260420_lifeos_cycle_tracking.sql
-- LifeOS — Menstrual / Perimenopause Cycle Tracking
--
-- Purpose: Track menstrual cycles, compute current phase, and feed phase context
-- into energy_patterns + decision-intelligence snapshots. No AI cost — pure math.
-- ~50% of users depend on this for accurate pattern intelligence.
--
-- Integration points:
--   energy_patterns   — cycle phase tagged alongside HRV/cognitive state
--   wearable_data     — basal temperature / RHR patterns confirm phase prediction
--   context_snapshots — decision-intelligence snapshots receive cycle_phase field

BEGIN;

-- 1. User cycle settings (opt-in, sovereign) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cycle_settings (
  user_id              BIGINT PRIMARY KEY REFERENCES lifeos_users(id) ON DELETE CASCADE,
  avg_cycle_length     INTEGER NOT NULL DEFAULT 28 CHECK (avg_cycle_length BETWEEN 14 AND 60),
  avg_period_length    INTEGER NOT NULL DEFAULT 5  CHECK (avg_period_length BETWEEN 1 AND 14),
  tracking_enabled     BOOLEAN NOT NULL DEFAULT true,
  notify_phase_change  BOOLEAN NOT NULL DEFAULT false,
  perimenopause_mode   BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Period log entries ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycle_entries (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  entry_type   TEXT NOT NULL CHECK (entry_type IN ('period_start','period_end','symptom','spotting')),
  flow_level   TEXT CHECK (flow_level IN ('light','medium','heavy','spotting')),
  symptoms     TEXT[],     -- e.g. ARRAY['cramps','bloating','headache','fatigue','mood_shifts']
  notes        TEXT,
  source       TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual','apple_health','flo_import','oura')),
  logged_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cycle_entries_user_time
  ON cycle_entries (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_cycle_entries_user_type
  ON cycle_entries (user_id, entry_type, logged_at DESC);

-- 3. Computed cycle phases (updated each time a new period_start is logged) ────
CREATE TABLE IF NOT EXISTS cycle_phases (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  cycle_start_date DATE NOT NULL,               -- date of period_start for this cycle
  cycle_length     INTEGER,                     -- actual length once next period logged
  phase_snapshots  JSONB,                       -- [{date, phase, day_of_cycle}] for audit
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, cycle_start_date)
);

CREATE INDEX IF NOT EXISTS idx_cycle_phases_user_start
  ON cycle_phases (user_id, cycle_start_date DESC);

-- 4. Add cycle_phase column to energy_patterns (safe if already exists) ─────────
ALTER TABLE energy_patterns
  ADD COLUMN IF NOT EXISTS cycle_phase TEXT
    CHECK (cycle_phase IN ('menstrual','follicular','ovulation','luteal_early','luteal_late'));

COMMIT;
