-- SYNOPSIS: Database migration — 20260724_lifeos_core_stable.sql.
-- This file originally contained placeholder instructional text ("Review Current
-- Migrations... Add the necessary SQL statements...") instead of real SQL — an
-- unfinished migration stub that got committed with a .sql extension. Every
-- production boot has been attempting to execute that text as SQL and failing
-- (syntax error), retried every boot per startup/database.js's fail-open design.
-- No real "LifeOS Core stability" schema change was ever specified, so rather
-- than invent one, this is neutralized to a genuine no-op so it stops erroring.
SELECT 1;
