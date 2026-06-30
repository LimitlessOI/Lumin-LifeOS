<!-- SYNOPSIS: History archive — parts car for wisdom and salvage -->

# History Archive (Parts Car)

**Not SSOT.** Not runtime authority. Not agent read order.

This folder holds **retired documents** — superseded paths, old digests, audit snapshots, and ideas worth keeping for **lessons, salvage, and IdeaVault mining**.

## Why it exists

When truth consolidates into one canonical home, the old file is not deleted blindly. It moves here like a **parts car**: you may pull a bolt, a panel, or an idea later without letting duplicate "truth" confuse cold agents.

## Rules

| Rule | Detail |
|---|---|
| **Never `@ssot` here** | Runtime code and product manifests must not point at `docs/history/**` |
| **Search allowed** | Agents may grep/read for ideas, receipts, and "what did we decide in 2026-05?" |
| **Promotion path** | Valuable idea → IdeaVault or product `conversations/` → then into live `PRODUCT_HOME.md` via receipt |
| **Naming** | `docs/history/<domain>/<original-name>_archived_YYYY-MM-DD.md` |

## What lives here

- `constitution/` — retired constitutional duplicates (pre–NORTH_STAR_SSOT consolidation)
- `products/` — retired cross-product specs (COMPLETE_PRODUCT_SPEC, etc.)
- `builderos/` — superseded BuilderOS alpha blueprint + change receipts
- `legacy-history-salvage/` — pre-archive inventory and migration receipts for retired authority files

## What is still live (not here)

| Layer | Canonical path |
|---|---|
| Constitutional law (ONE file) | `docs/constitution/NORTH_STAR_SSOT.md` |
| Operational companion | `docs/SSOT_COMPANION.md` |
| Product law | `docs/products/<id>/PRODUCT_HOME.md` |
| Build queue | `builderos-reboot/BP_PRIORITY.json` |
