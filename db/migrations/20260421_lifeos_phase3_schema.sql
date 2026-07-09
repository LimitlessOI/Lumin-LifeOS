-- SYNOPSIS: Database migration — 20260421_lifeos_phase3_schema.sql.
-- Phase 3 tables

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  trigger text,
  cue text,
  reward text,
  streak int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits (user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits (active);

CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  habit_id uuid,
  logged_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs (habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_logged_date ON habit_logs (logged_date);

CREATE TABLE IF NOT EXISTS energy_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  datetime timestamptz,
  level int CHECK (level BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_energy_logs_user_id ON energy_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_energy_logs_datetime ON energy_logs (datetime);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  logged_date date,
  meal_label text,
  items jsonb,
  mood_after int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_id ON nutrition_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_logged_date ON nutrition_logs (logged_date);

CREATE TABLE IF NOT EXISTS body_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  logged_date date,
  movement_minutes int,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_logs_user_id ON body_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_body_logs_logged_date ON body_logs (logged_date);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  snapshot_month date,
  assets numeric,
  liabilities numeric,
  net_worth numeric GENERATED ALWAYS AS (assets - liabilities) STORED,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_id ON net_worth_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_snapshot_month ON net_worth_snapshots (snapshot_month);

CREATE TABLE IF NOT EXISTS learning_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  type text,
  url text,
  status text DEFAULT 'queued',
  key_insight text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_queue_user_id ON learning_queue (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_queue_status ON learning_queue (status);

CREATE TABLE IF NOT EXISTS calendar_protection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  label text,
  rrule text,
  start_time time,
  end_time time,
  days_of_week int[],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_protection_rules_user_id ON calendar_protection_rules (user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_protection_rules_active ON calendar_protection_rules (active);