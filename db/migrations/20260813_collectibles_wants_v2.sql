-- SYNOPSIS: Collectibles V2 Want Graph — canonical `wants` table (SCHEMA_CONTRACTS.md §11)
-- plus a `user_collectible_wants` compatibility view for the already-generated
-- want-graph service, which was authored against that name before this table existed.
-- @ssot docs/products/collectibles/PRODUCT_HOME.md
-- Source: docs/products/collectibles/SCHEMA_CONTRACTS.md (V2, §11 wants; index pattern §"Want match (V2)")

CREATE TABLE IF NOT EXISTS wants (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id TEXT NOT NULL,
  want_type TEXT NOT NULL CHECK (want_type IN (
    'want', 'watch', 'love', 'need_for_deck', 'need_for_set'
  )),
  target_ref JSONB NOT NULL,
  max_bid_cents INT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wants_active_category ON wants (active, category_id);
CREATE INDEX IF NOT EXISTS idx_wants_user_active ON wants (user_id, active);

CREATE OR REPLACE VIEW user_collectible_wants AS SELECT * FROM wants;
