-- SYNOPSIS: Repair lab_results schema mismatch + create psychometric_results.
-- Root cause: 20260422 created lab_results(user_id UUID, results jsonb).
-- 20260718 CREATE TABLE IF NOT EXISTS no-op'd; index on drawn_at failed and
-- rolled back psychometric_results with it. App writes BIGINT + biomarkers and
-- silently falls back to memory — longevity labs never persisted.
-- Safe: only rewrite user_id type when row count is 0 (confirmed empty on tip audit).

DO $$
DECLARE
  n BIGINT := 0;
BEGIN
  IF to_regclass('public.lab_results') IS NULL THEN
    CREATE TABLE lab_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id BIGINT NOT NULL REFERENCES lifeos_users(id),
      drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      biomarkers JSONB NOT NULL DEFAULT '{}'::jsonb,
      chronological_age NUMERIC,
      results JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    RETURN;
  END IF;

  SELECT COUNT(*) INTO n FROM lab_results;

  IF n = 0 THEN
    ALTER TABLE lab_results DROP COLUMN IF EXISTS user_id;
    ALTER TABLE lab_results ADD COLUMN user_id BIGINT REFERENCES lifeos_users(id);
    -- Allow NULL briefly if table is empty with no inserts yet; app always supplies user_id.
    UPDATE lab_results SET user_id = 1 WHERE user_id IS NULL; -- no-op on empty
    ALTER TABLE lab_results ALTER COLUMN user_id SET NOT NULL;
  ELSE
    RAISE WARNING 'lab_results has % rows — skipping user_id UUID→BIGINT rewrite; add columns only', n;
  END IF;
END $$;

ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS drawn_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS biomarkers JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS chronological_age NUMERIC;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS results JSONB;
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS lab_results_user_drawn_idx
  ON lab_results (user_id, drawn_at DESC);

CREATE TABLE IF NOT EXISTS psychometric_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id),
  instrument TEXT NOT NULL,
  result_label TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, instrument)
);

CREATE INDEX IF NOT EXISTS psychometric_results_user_idx
  ON psychometric_results (user_id);
