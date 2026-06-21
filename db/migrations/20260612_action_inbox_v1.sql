-- SYNOPSIS: Database migration — 20260612_action_inbox_v1.sql.
-- Action Inbox v1 schema
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
-- Mission: PRODUCT-ACTION-INBOX-V1-0001

CREATE TABLE IF NOT EXISTS action_inbox_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        BIGINT REFERENCES lifeos_users(id) ON DELETE CASCADE,
  session_id     TEXT,
  source         TEXT NOT NULL DEFAULT 'api',
  raw_text       TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'unknown',
  status         TEXT NOT NULL DEFAULT 'staged',
  routed_to      TEXT,
  receipt_id     UUID,
  private        BOOLEAN NOT NULL DEFAULT FALSE,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_inbox_receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_item_id UUID NOT NULL REFERENCES action_inbox_items(id) ON DELETE CASCADE,
  outcome       TEXT NOT NULL,
  detail        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_inbox_items_user_status
  ON action_inbox_items (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_inbox_items_user_created
  ON action_inbox_items (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_action_inbox_receipts_item
  ON action_inbox_receipts (inbox_item_id);
