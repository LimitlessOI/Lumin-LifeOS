<!-- SYNOPSIS: Legacy authority salvage staging area -->

# Legacy History Salvage

This folder is the staging area for authority files that are no longer supposed to be live, but cannot be archived blindly.

## What this folder is for

- inventory before archive
- salvage notes
- migration receipts
- preserved lineage for old amendment-era artifacts

## What this folder is not

- not runtime authority
- not product SSOT
- not a place to dump files without classification

## Current artifacts

- [`LEGACY_AUTHORITY_INVENTORY.json`](LEGACY_AUTHORITY_INVENTORY.json) — machine inventory of flat product files, legacy project docs, and broken runtime amendment references
- `docs-projects-root/` — archived root-level `docs/projects/*` files that no longer belong in the active build surface

## Archive rule

Before a file lands here as history:

1. we know what value is inside it
2. we know whether any live code still depends on it
3. we know whether its useful doctrine was promoted elsewhere
4. we record why it is safe to retire
