CREATE TABLE IF NOT EXISTS sleep_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  sleep_start TIMESTAMPTZ NOT NULL,
  sleep_end TIMESTAMPTZ NOT NULL,
  duration_minutes INT GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (sleep_end - sleep_start))/60)::INT STORED,
  quality SMALLINT CHECK (quality BETWEEN 1 AND 10),
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_start ON sleep_logs(user_id, sleep_start DESC);