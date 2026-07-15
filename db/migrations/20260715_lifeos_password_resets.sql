-- SYNOPSIS: lifeos_password_resets — self-serve password reset tokens for SMOS/LifeOS clients
-- @ssot docs/products/lifeos/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS lifeos_password_resets (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  request_ip text
);

CREATE INDEX IF NOT EXISTS lifeos_password_resets_user_idx
  ON lifeos_password_resets (user_id);
