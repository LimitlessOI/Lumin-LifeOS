BEGIN;

CREATE TABLE IF NOT EXISTS response_variety_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  opening_style   TEXT,
  length_style    TEXT,
  tone_register   TEXT,
  question_ending TEXT,
  style_fingerprint TEXT, -- JSON string of all 4 for quick lookup
  response_preview  TEXT,
  context         TEXT,   -- 'coaching'|'mediation'|'truth_delivery'|'commitment_prod'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variety_user ON response_variety_log (user_id, created_at DESC);

COMMIT;
