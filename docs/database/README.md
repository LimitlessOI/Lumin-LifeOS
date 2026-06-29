<!-- SYNOPSIS: Neon database guide — simple -->

# Neon Database Guide

**Audit command:** `node scripts/neon-schema-audit.mjs --write`  
**Latest report:** `data/neon-schema-audit.json`

---

## Current state (2026-06-29)

| Metric | Count |
|--------|------:|
| `public` tables | **460** (down from 509) |
| `archive` tables | **49** (29 empty prototypes + 20 legacy orphan-data) |
| Tables with rows in `public` | ~88 active product data |
| Empty but code-referenced | ~372 (schema-ready — leave until product ships) |

---

## Three buckets

| Bucket | Meaning | What we do |
|--------|---------|------------|
| **KEEP** | Code uses it and/or it has real rows | Leave in `public` |
| **ARCHIVE** | No code references — prototype or legacy data | Move to `archive` schema (reversible) |
| **SCHEMA_READY** | Empty, code references it | Leave in `public` until feature ships |

---

## Schemas

| Schema | Purpose |
|--------|---------|
| `public` | Live product tables only |
| `archive` | Retired tables — parts car, not deleted |

---

## Safe cleanup rule

**Never DROP** without export + receipt.  
**Default move:** `ALTER TABLE … SET SCHEMA archive;`

---

## Migrations applied

| Migration | What moved |
|-----------|------------|
| `20260630_neon_archive_abandoned_tables.sql` | 29 empty prototype tables (drone_fleet, ubi_users, subconscious, …) |
| `20260630_neon_archive_orphan_data_tables.sql` | 20 legacy tables with orphan rows (task_outputs 68k, compression_stats 54k, old orch_* builder stubs, …) |

**Restore any table:** `ALTER TABLE archive.<name> SET SCHEMA public;`

---

## Migrations (new tables)

All new tables: `db/migrations/YYYYMMDD_name.sql` only.  
Boot applies them via `startup/database.js`.
