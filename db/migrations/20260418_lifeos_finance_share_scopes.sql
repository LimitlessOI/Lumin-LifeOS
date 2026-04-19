-- Migration: 20260418_lifeos_finance_share_scopes
-- Household shared finance — per-category sharing scope between linked users.
--
-- Model: the OWNER of a category (the user who created it) can grant one or more
-- linked household members VIEW access to transactions tagged with that category.
-- All other transactions remain private. This is additive — default state is
-- "nothing shared" even when a household_link exists.
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

CREATE TABLE IF NOT EXISTS finance_share_scopes (
  id               BIGSERIAL PRIMARY KEY,
  owner_user_id    BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  viewer_user_id   BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  category_id      BIGINT NOT NULL REFERENCES lifeos_finance_categories(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ,
  UNIQUE (owner_user_id, viewer_user_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_share_scopes_viewer
  ON finance_share_scopes (viewer_user_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_share_scopes_owner
  ON finance_share_scopes (owner_user_id) WHERE revoked_at IS NULL;

COMMIT;
