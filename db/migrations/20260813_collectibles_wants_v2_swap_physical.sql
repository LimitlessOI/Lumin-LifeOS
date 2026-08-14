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

-- Founder-alert correction 2026-08-14 (round 1): this migration was recorded
-- as failed on every boot since 2026-08-13. First attempt added
-- `DROP VIEW IF EXISTS user_collectible_wants CASCADE`, reasoning the name
-- was occupied by a view. That fix deployed live but the migration KEPT
-- failing -- meaning the real starting state wasn't fully known (no way to
-- inspect production schema directly from this session; local DATABASE_URL
-- is confirmed NOT to be production, verified by cross-checking a live row
-- count against the real API). DROP VIEW itself errors if the target is
-- actually a TABLE, not a view, so that fix could fail the same way for a
-- different reason.
--
-- Round 2: stop guessing which single state it's in. Check relation kind
-- explicitly via pg_views/pg_tables for BOTH names before touching either,
-- so this converges correctly no matter which of the real possible starting
-- states production is actually in.
DO $$
DECLARE
  wants_is_table boolean;
  wants_is_view boolean;
  ucw_is_table boolean;
  ucw_is_view boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wants') INTO wants_is_table;
  SELECT EXISTS (SELECT 1 FROM pg_views  WHERE schemaname = 'public' AND viewname  = 'wants') INTO wants_is_view;
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_collectible_wants') INTO ucw_is_table;
  SELECT EXISTS (SELECT 1 FROM pg_views  WHERE schemaname = 'public' AND viewname  = 'user_collectible_wants') INTO ucw_is_view;

  -- wants: drop only if it's a TABLE and confirmed empty (guaranteed empty
  -- per the original migration's own reasoning -- its only write path was
  -- failing GROUNDING_FAIL 100% of the time). Nested IF, not a combined AND
  -- -- Postgres does not short-circuit the COUNT(*) subquery here, so
  -- `wants_is_table AND (SELECT COUNT(*) FROM wants)=0` throws
  -- "relation wants does not exist" when the table is genuinely absent,
  -- reproduced locally: this was very likely the true original failure,
  -- predating today's view/table-swap fix entirely.
  IF wants_is_table THEN
    IF (SELECT COUNT(*) FROM wants) = 0 THEN
      EXECUTE 'DROP TABLE wants';
    END IF;
  END IF;

  -- user_collectible_wants: drop only if it's a VIEW (never drop a table
  -- here -- if it's already a real table, leave its data alone entirely).
  IF ucw_is_view THEN
    EXECUTE 'DROP VIEW user_collectible_wants CASCADE';
  END IF;
END $$;

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

-- Only (re)create the `wants` view if the name is now free or already a
-- view -- if it's still a non-empty table at this point (real data present,
-- the guard above deliberately left it alone), skip rather than error; that
-- state needs a human look, not a migration silently dropping real rows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wants') THEN
    EXECUTE 'CREATE OR REPLACE VIEW wants AS SELECT * FROM user_collectible_wants';
  END IF;
END $$;
