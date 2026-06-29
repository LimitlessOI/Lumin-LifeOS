-- SYNOPSIS: BuilderOS artifact — 20260629 Lifeos User Auth.
-- Migration: 20260629_lifeos_user_auth.sql
-- Idempotent auth columns + sessions + invites.
-- The primary schema is in 20260418_lifeos_auth.sql; this fills any gaps for V1 alpha launch.

ALTER TABLE lifeos_users
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS role          TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS tier          TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_lifeos_users_email ON lifeos_users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS lifeos_sessions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_lifeos_sessions_user  ON lifeos_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_lifeos_sessions_token ON lifeos_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_lifeos_sessions_exp   ON lifeos_sessions (expires_at);

CREATE TABLE IF NOT EXISTS lifeos_invites (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_by  BIGINT REFERENCES lifeos_users(id),
  used_by     BIGINT REFERENCES lifeos_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at     TIMESTAMPTZ,
  max_uses    INT NOT NULL DEFAULT 1,
  use_count   INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lifeos_invites_code ON lifeos_invites (code);
