-- 20260420_lifeos_balance_wheel.sql
-- Life Balance Wheel: 8-area self-rating, tracked over time
-- Areas: health, relationships, finance, work, growth, spirituality, fun, environment

CREATE TABLE IF NOT EXISTS balance_wheel_scores (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  scored_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  health          SMALLINT CHECK (health          BETWEEN 1 AND 10),
  relationships   SMALLINT CHECK (relationships   BETWEEN 1 AND 10),
  finance         SMALLINT CHECK (finance         BETWEEN 1 AND 10),
  work            SMALLINT CHECK (work            BETWEEN 1 AND 10),
  growth          SMALLINT CHECK (growth          BETWEEN 1 AND 10),
  spirituality    SMALLINT CHECK (spirituality    BETWEEN 1 AND 10),
  fun             SMALLINT CHECK (fun             BETWEEN 1 AND 10),
  environment     SMALLINT CHECK (environment     BETWEEN 1 AND 10),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scored_on)
);

CREATE INDEX IF NOT EXISTS idx_balance_wheel_user_date
  ON balance_wheel_scores (user_id, scored_on DESC);
