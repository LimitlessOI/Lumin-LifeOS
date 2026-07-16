-- SYNOPSIS: Database migration — intentionally a no-op. The `provider_cooldowns` table is created by `20231005_add_provider_cooldowns.sql` with `CREATE TABLE IF NOT EXISTS provider_cooldowns`.
-- @ssot docs/products/ai-council/PRODUCT_HOME.md

-- This migration previously duplicated the `provider_cooldowns` table creation and caused
-- a `CREATE_TABLE_COLLISION_RISK` preflight failure. The canonical schema lives in
-- `20231005_add_provider_cooldowns.sql`; this file is kept as a no-op to preserve
-- filename ordering and any existing migration ledger entries.
