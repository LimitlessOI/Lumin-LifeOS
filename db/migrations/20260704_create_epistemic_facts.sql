-- SYNOPSIS: Database migration — intentionally a no-op.
-- @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
--
-- The canonical `epistemic_facts` table definition lives in
-- `20260426_memory_intelligence.sql`. This file is kept as a no-op to preserve
-- migration ledger ordering and avoid a duplicate CREATE TABLE collision.

SELECT 1;
