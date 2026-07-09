-- SYNOPSIS: Canonical append-only founder↔AI memory entries (receipt-linked).
-- @ssot docs/products/memory-system/PRODUCT_HOME.md

CREATE TABLE IF NOT EXISTS founder_memory_entries (
  id              TEXT PRIMARY KEY,
  receipt_id      TEXT NOT NULL UNIQUE,
  session_id      TEXT NOT NULL,
  product_ids     TEXT[] NOT NULL DEFAULT '{}',
  classification  TEXT NOT NULL CHECK (classification IN ('decision', 'idea', 'chore')),
  role            TEXT NOT NULL CHECK (role IN ('founder', 'assistant', 'system')),
  content         TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_memory_session
  ON founder_memory_entries (session_id);

CREATE INDEX IF NOT EXISTS idx_founder_memory_occurred
  ON founder_memory_entries (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_memory_classification
  ON founder_memory_entries (classification);

CREATE INDEX IF NOT EXISTS idx_founder_memory_product_ids
  ON founder_memory_entries USING GIN (product_ids);

CREATE INDEX IF NOT EXISTS idx_founder_memory_receipt
  ON founder_memory_entries (receipt_id);

CREATE INDEX IF NOT EXISTS idx_founder_memory_content_fts
  ON founder_memory_entries USING GIN (to_tsvector('english', content));
