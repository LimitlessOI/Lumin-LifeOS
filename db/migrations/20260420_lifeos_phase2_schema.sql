-- SYNOPSIS: Database migration — 20260420_lifeos_phase2_schema.sql.
CREATE TABLE IF NOT EXISTS sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  date date,
  bedtime timestamptz,
  wake_time timestamptz,
  quality smallint,
  dreams text,
  hrv_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  "trigger" text,
  cue text,
  reward text,
  streak int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  habit_id uuid REFERENCES habits(id),
  logged_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gratitude_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  date date,
  entries jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  snapshot_date date,
  assets_cents bigint,
  liabilities_cents bigint,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS future_self_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  content text,
  deliver_on date,
  delivered boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS energy_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  logged_at timestamptz,
  level smallint,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS important_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  person_name text,
  date date,
  type text,
  notes text,
  created_at timestamptz DEFAULT now()
);

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