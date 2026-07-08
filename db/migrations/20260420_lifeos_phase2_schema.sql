-- SYNOPSIS: Database migration — 20260420_lifeos_phase2_schema.sql.
-- Phase 2 tables

CREATE TABLE IF NOT EXISTS sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  date date,
  bedtime timestamptz,
  wake_time timestamptz,
  quality smallint,
  dreams text,
  hrv_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_id ON sleep_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_date ON sleep_logs (date);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_id_date ON sleep_logs (user_id, date);

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  trigger text,
  cue text,
  reward text,
  streak integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits (user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits (active);
CREATE INDEX IF NOT EXISTS idx_habits_user_id_active ON habits (user_id, active);

CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  habit_id uuid REFERENCES habits(id),
  logged_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs (habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_logged_at ON habit_logs (logged_at);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id_logged_at ON habit_logs (user_id, logged_at);

CREATE TABLE IF NOT EXISTS gratitude_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  date date,
  entries jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gratitude_logs_user_id ON gratitude_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_gratitude_logs_date ON gratitude_logs (date);
CREATE INDEX IF NOT EXISTS idx_gratitude_logs_user_id_date ON gratitude_logs (user_id, date);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  snapshot_date date,
  assets_cents bigint,
  liabilities_cents bigint,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_id ON net_worth_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_snapshot_date ON net_worth_snapshots (snapshot_date);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_id_snapshot_date ON net_worth_snapshots (user_id, snapshot_date);

CREATE TABLE IF NOT EXISTS future_self_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  content text,
  deliver_on date,
  delivered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_future_self_letters_user_id ON future_self_letters (user_id);
CREATE INDEX IF NOT EXISTS idx_future_self_letters_deliver_on ON future_self_letters (deliver_on);
CREATE INDEX IF NOT EXISTS idx_future_self_letters_delivered ON future_self_letters (delivered);
CREATE INDEX IF NOT EXISTS idx_future_self_letters_user_id_deliver_on ON future_self_letters (user_id, deliver_on);

CREATE TABLE IF NOT EXISTS energy_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  logged_at timestamptz,
  level smallint,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_energy_logs_user_id ON energy_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_energy_logs_logged_at ON energy_logs (logged_at);
CREATE INDEX IF NOT EXISTS idx_energy_logs_user_id_logged_at ON energy_logs (user_id, logged_at);

CREATE TABLE IF NOT EXISTS important_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  person_name text,
  date date,
  type text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_important_dates_user_id ON important_dates (user_id);
CREATE INDEX IF NOT EXISTS idx_important_dates_date ON important_dates (date);
CREATE INDEX IF NOT EXISTS idx_important_dates_type ON important_dates (type);
CREATE INDEX IF NOT EXISTS idx_important_dates_user_id_date ON important_dates (user_id, date);

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
CREATE INDEX IF NOT EXISTS idx_learning_queue_type ON learning_queue (type);
CREATE INDEX IF NOT EXISTS idx_learning_queue_user_id_status ON learning_queue (user_id, status);