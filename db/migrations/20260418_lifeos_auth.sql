-- Migration: 20260418_lifeos_auth
-- LifeOS User Authentication — JWT-based login, sessions, invite codes
-- Adds auth fields to lifeos_users; creates sessions + invites tables.
-- No new tables break existing FK chains — all additions are ALTER + CREATE IF NOT EXISTS.
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Extend lifeos_users with auth fields ─────────────────────────────────────
ALTER TABLE lifeos_users ADD COLUMN IF NOT EXISTS email          TEXT UNIQUE;
ALTER TABLE lifeos_users ADD COLUMN IF NOT EXISTS password_hash  TEXT;
ALTER TABLE lifeos_users ADD COLUMN IF NOT EXISTS role           TEXT NOT NULL DEFAULT 'member'; -- 'admin' | 'member'
ALTER TABLE lifeos_users ADD COLUMN IF NOT EXISTS tier           TEXT NOT NULL DEFAULT 'free';   -- 'free' | 'core' | 'premium' | 'family'
ALTER TABLE lifeos_users ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ;

-- Existing adam row gets admin + premium
UPDATE lifeos_users SET role = 'admin', tier = 'premium' WHERE user_handle = 'adam';

-- ── Sessions (refresh token store) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lifeos_sessions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 of the refresh token
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent  TEXT,
  ip_address  TEXT
);

CREATE INDEX IF NOT EXISTS idx_lifeos_sessions_user  ON lifeos_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lifeos_sessions_token ON lifeos_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_lifeos_sessions_exp   ON lifeos_sessions(expires_at);

-- ── Invite codes (Sherry + future users) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS lifeos_invites (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'member',
  tier        TEXT NOT NULL DEFAULT 'core',
  email       TEXT,          -- optional: pre-assign to specific email
  used_by     BIGINT REFERENCES lifeos_users(id),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_by  BIGINT REFERENCES lifeos_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifeos_invites_code ON lifeos_invites(code);

-- Pre-seed Sherry's invite (valid 90 days from now; admin can regenerate)
-- Code: SHERRY-LIFEOS-2026  (change via POST /api/v1/lifeos/auth/invite after first login)
INSERT INTO lifeos_invites (code, role, tier, email, expires_at, created_by)
SELECT
  'SHERRY-LIFEOS-2026',
  'member',
  'premium',
  NULL,
  NOW() + INTERVAL '90 days',
  (SELECT id FROM lifeos_users WHERE user_handle = 'adam' LIMIT 1)
ON CONFLICT (code) DO NOTHING;

COMMIT;
