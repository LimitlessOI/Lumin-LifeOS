-- LifeOS habits lane (P1 parity gap): identity-framed recurring tracker.

CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  identity_statement TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekly')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_active
  ON habits (user_id, active, created_at DESC);

CREATE TABLE IF NOT EXISTS habit_completions (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, completion_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date
  ON habit_completions (habit_id, completion_date DESC);
