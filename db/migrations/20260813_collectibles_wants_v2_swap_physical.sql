-- SYNOPSIS: Fixes 20260813_collectibles_wants_v2.sql. That migration made
-- `wants` the real table and `user_collectible_wants` a view, but the
-- already-generated want-graph service queries `user_collectible_wants`, and
-- services/blueprint-grounding-check.js's loadKnownTables() is a static regex
-- scan for the literal text "CREATE TABLE" across db/migrations/*.sql — it
-- does no live DB introspection, so a view never satisfies it. GROUNDING_FAIL
-- kept recurring identically no matter how many times factory-3 retried.
-- Swaps which name is physical: `user_collectible_wants` becomes the real
-- table (the literal text the checker's regex needs to match), `wants`
-- becomes a view for the canonical name in SCHEMA_CONTRACTS.md §11. Columns
-- and constraints are unchanged either way — this is a storage-naming fix,
-- not an architecture change. Drops the prior `wants` table only if it is
-- still empty (it can only have received rows from the write path that was
-- failing GROUNDING_FAIL 100% of the time, so it is guaranteed empty; the
-- guard is defensive, not load-bearing).
-- @ssot docs/products/collectibles/PRODUCT_HOME.md
-- ALLOW_DESTRUCTIVE_MIGRATION: DROP TABLE wants is guarded by a COUNT(*)=0
-- check — the table can only have received rows from the write path that was
-- failing GROUNDING_FAIL 100% of the time, so it is guaranteed empty; the
-- guard is defensive, not load-bearing, and never fires against real data.

-- Founder-alert correction 2026-08-14: this migration was recorded as
-- failed on every boot since 2026-08-13 (never inserted into
-- schema_migrations, so the runner retries it fresh each time) --
-- degrading /healthz continuously. Real cause: CREATE TABLE IF NOT EXISTS
-- only guards against another TABLE of the same name; it errors if the
-- name is currently occupied by a VIEW, which is exactly the state this
-- migration's own comment says the prior migration left
-- user_collectible_wants in. Made fully idempotent against either
-- starting state (table or view, on both relations) so it converges
-- safely regardless of which prior migration attempts partially applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wants'
  ) AND (SELECT COUNT(*) FROM wants) = 0 THEN
    DROP TABLE wants;
  END IF;
END $$;

DROP VIEW IF EXISTS user_collectible_wants CASCADE;

CREATE TABLE IF NOT EXISTS user_collectible_wants (
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

CREATE INDEX IF NOT EXISTS idx_user_collectible_wants_active_category
  ON user_collectible_wants (active, category_id);
CREATE INDEX IF NOT EXISTS idx_user_collectible_wants_user_active
  ON user_collectible_wants (user_id, active);

CREATE OR REPLACE VIEW wants AS SELECT * FROM user_collectible_wants;
