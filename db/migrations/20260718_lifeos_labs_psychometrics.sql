-- SYNOPSIS: lab_results + psychometric_results for LifeOS longevity/psychometric P1s.
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  biomarkers JSONB NOT NULL DEFAULT '{}'::jsonb,
  chronological_age NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lab_results_user_drawn_idx ON lab_results (user_id, drawn_at DESC);

CREATE TABLE IF NOT EXISTS psychometric_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  instrument TEXT NOT NULL,
  result_label TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, instrument)
);

CREATE INDEX IF NOT EXISTS psychometric_results_user_idx ON psychometric_results (user_id);
