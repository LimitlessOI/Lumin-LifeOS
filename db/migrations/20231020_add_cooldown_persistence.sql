-- SYNOPSIS: Database migration — 20231020_add_cooldown_persistence.sql.
-- db/migrations/20231020_add_cooldown_persistence.sql
-- This file is intentionally a no-op. The `provider_cooldowns` table was already
-- created by the earlier migration `20231005_add_provider_cooldowns.sql` with a
-- `provider_name` column; recreating it with `provider_id` would conflict.
DO $$
BEGIN
  -- no-op
END $$;
