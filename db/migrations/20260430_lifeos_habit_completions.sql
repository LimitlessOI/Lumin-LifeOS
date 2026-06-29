-- SYNOPSIS: Database migration — 20260430_lifeos_habit_completions.sql.
-- LifeOS habit completion tracking
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS lifeos_habit_completions (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, "user_id", completed_date)
);

CREATE INDEX idx_habit_completions_user_habit ON lifeos_habit_completions("user_id", habit_id, completed_date DESC);