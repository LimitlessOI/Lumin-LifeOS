<!-- SYNOPSIS: Founder packet for CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001 -->

# CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001 — Founder Packet

## WHAT

Convert the current constitutional/authority landscape into a single active reality. Every constitutional or authority-bearing concept must resolve to exactly one legitimate active owner. Valuable ideas not yet represented in the active Constitution must be visible in a Constitutional Candidate Ledger. Superseded, duplicate, misleading, or obsolete authority-bearing artifacts must be removed from active reality, preserved in governed history, and mechanically prevented from influencing current runtime or authority.

The first deliverable is non-destructive: a classification and candidate-extraction report. No files are moved, renamed, archived, or deleted until the report is reviewed.

## PASS

1. A `CLASSIFICATION_REPORT.md` exists that lists every authority-bearing artifact discovered in a first-pass scan.
2. Each artifact is classified by:
   - exact authority claim (quoted text);
   - claimed scope (constitutional, governance, operational, product-local, registry-local, historical);
   - granting source (which higher document/registry/delegation authorizes it);
   - active consumers (agent read order, runtime imports, gates, registries);
   - runtime reachability (can it affect a build, deploy, or conversation path?);
   - conflict (duplicate, stale, unregistered, contradiction);
   - recommended disposition (retain, relabel, move to history, supersede, delete);
   - action owner (Founder, Chair, product-owner, mechanical).
3. A `CONSTITUTIONAL_CANDIDATE_LEDGER.md` exists containing any valuable principle found outside the active Constitution, with source quotation, context, proposed destination, Truth Ladder level, and proof required before promotion.
4. No active file is modified, moved, renamed, or deleted in the first deliverable.
5. `npm run builder:preflight` passes with the new mission artifacts staged.

## Constraints

- Derive authority rules only from currently recognized higher sources: `docs/constitution/NORTH_STAR_SSOT.md`, `docs/SSOT_COMPANION.md`, `docs/products/AUTHORITY_BOUNDARIES.md`, `docs/products/PRODUCT_REGISTRY.json`, `docs/products/CANONICAL_PRODUCT_HOME_RULES.md`, `builderos-reboot/AGENTS.md`, `builderos-reboot/BP_PRIORITY.json`, `builderos-reboot/HIST_DOMAIN_REGISTRY.json`, `data/constitutional-framework/REGISTRY.json`, `data/constitutional-framework/ENFORCEMENT_MATRIX.json`.
- Do not use an auditor-created path allowlist as a constitutional standard; every permitted namespace must cite its granting source.
- Separate constitutional-authority claims, scoped canonical sources, registry conflicts, historical contamination, filename-only candidates, and duplicate active authorities.
- Treat `CANONICAL` as scoped, not automatically constitutional. A canonical registry of proposed items is not the same as its contents being law.
- Do not delete historical evidence before extracting unique ideas for the Candidate Ledger.
- `PRODUCT_HOME.md` files are not illegitimate merely because the registry disagrees; determine which side is stale.
- Archived or conversation-dump files are not active authority unless proven by read order, registry, gate, import, or runtime influence.
