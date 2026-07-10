-- SYNOPSIS: Database migration — 20260421_lifeos_phase3_schema.sql.
-- Phase 3 tables that are NOT already created by 20260420_lifeos_phase2_schema.sql.
-- DO NOT re-CREATE habits / habit_logs / energy_logs / net_worth_snapshots / learning_queue:
-- those exist from phase2 with different column names; CREATE INDEX on missing columns
-- aborted boot and left this file unapplied.

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  logged_date date,
  meal_label text,
  items jsonb,
  mood_after integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_id
  ON nutrition_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_logged_date
  ON nutrition_logs (logged_date);

CREATE TABLE IF NOT EXISTS body_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  logged_date date,
  movement_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_logs_user_id
  ON body_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_body_logs_logged_date
  ON body_logs (logged_date);

CREATE TABLE IF NOT EXISTS calendar_protection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  label text,
  rrule text,
  start_time time,
  end_time time,
  days_of_week integer[],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_protection_rules_user_id
  ON calendar_protection_rules (user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_protection_rules_active
  ON calendar_protection_rules (active);
