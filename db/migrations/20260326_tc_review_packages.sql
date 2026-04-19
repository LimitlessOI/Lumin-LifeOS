-- Migration: 20260326_tc_review_packages
-- Amendment 17 — TC document review packages for mobile review/approval handoff.

BEGIN;

CREATE TABLE IF NOT EXISTS tc_review_packages (
  id              BIGSERIAL PRIMARY KEY,
  transaction_id  BIGINT REFERENCES tc_transactions(id) ON DELETE CASCADE,
  approval_id     BIGINT REFERENCES tc_approval_items(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  doc_type        TEXT,
  file_name       TEXT NOT NULL,
  stored_path     TEXT NOT NULL,
  mime_type       TEXT,
  size_bytes      BIGINT,
  status          TEXT NOT NULL DEFAULT 'pending_review',
  review_summary  TEXT,
  validation      JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_review_packages_tx ON tc_review_packages (transaction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_review_packages_status ON tc_review_packages (status, created_at DESC);

COMMIT;
