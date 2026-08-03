<!-- SYNOPSIS: Human-readable disposition lock for CARC-002. Review and approve each row before CARC-003 moves. -->

# CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001 — Disposition Lock (CARC-002)

**Mission:** `CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001`  
**Phase:** CARC-002  
**Status:** `PROPOSED`  
**Created:** `2026-08-04`  
**Review authority:** `Founder / Chair`

This lock is a **proposal** for Founder/Chair review. No file should be moved, renamed, archived, deleted, or superseded until the corresponding row is approved and `move_authorized` flips to `true`.

## Disposition table

| ID | Current path | Current claim (truncated) | Legitimate scope | Proposed disposition | Decision authority | Move authorized |
|---|---|---|---|---|---|---|
| CARC-002-A-01 | `docs/TCO_ANNEX.md` | SSOT ANNEX — TOTALCOSTOPTIMIZER (TCO); Status: Canonical Annex (referenced by North Star; does not override Constitution… | historical_only / candidate_content | PROPOSED: move + supersede | Founder / api-cost-savings product-owner | No |
| CARC-002-B-01 | `data/constitutional-framework/RESEARCH_REGISTRY.json` | authority.status: CANONICAL; domain: Research; note says contents are not governing authority until promoted. | canonical_governance_container | PROPOSED: relabel | Chair / mechanical | No |
| CARC-002-B-02 | `data/lenses/LENS_REGISTRY.json` | _authority.status: CANONICAL; domain: Machine; role: Catalog of reusable cognitive assets (lenses). | canonical_operational | PROPOSED: relabel / optionally relocate | builderos product-owner / Chair | No |
| CARC-002-B-03 | `docs/products/PRODUCT_BUILD_PRIORITY.json` | _authority.status: CANONICAL; domain: Product; owner: Founder (Adam); founder-owned financial priority order. | canonical_operational | PROPOSED: relabel | Founder / mechanical | No |
| CARC-002-B-04 | `docs/COMPLETION_VOCABULARY_SSOT.md` | Status: LOCKED v1.0; Authority: Language law for receipts, cert JSON, readiness reports, Chair prose, CI overclaim guard… | canonical_operational | PROPOSED: relocate + relabel | builderos product-owner / Chair | No |
| CARC-002-C-01 | `docs/products/lip/PRODUCT_HOME.md` | Product id: lip; Canonical home: this file; Machine manifest: docs/products/lip/FILE_MANIFEST.json. | TBD: canonical_product or historical_only | PROPOSED: TBD pending founder decision | Founder | No |
| CARC-002-D-01 | `docs/products/command-center/PRODUCT_HOME.md` | Owned Files list includes public/overlay/command-center.html (do not replace), public/overlay/lifeos-command-center.html… | canonical_product (for API/routes), but active UI claim is stale | PROPOSED: rewrite product home | command-center product-owner / Builder | No |
| CARC-002-D-02 | `public/overlay/command-center.html` | None in file header; treated as active UI by docs/products/command-center/PRODUCT_HOME.md. | historical_only | PROPOSED: move | command-center product-owner / Builder | No |
| CARC-002-D-03 | `public/overlay/lifeos-command-center.html` | None in file header; treated as active UI by docs/products/command-center/PRODUCT_HOME.md. | historical_only | PROPOSED: move | command-center product-owner / Builder | No |
| CARC-002-D-04 | `docs/products/lifeos/PRODUCT_HOME.md` | Line 990: public/overlay/lifeos-backtest.html renders backtest results with education-only banner. Change receipts refer… | canonical_product | PROPOSED: rewrite stale references | lifeos product-owner / Builder | No |
| CARC-002-D-05 | `docs/products/project-governance/PRODUCT_HOME.md` | Line 186: Wire governance drill-down into the Command Center overlay #project-governance-panel in lifeos-command-center.… | canonical_product | PROPOSED: rewrite stale references | project-governance product-owner / Builder | No |
| CARC-002-E-01 | `docs/LIFEOS_PROGRAM_MAP_SSOT.md` | Canonical product SSOT hub for LifeOS program map; Authority order places this file as #3 after North Star and lifeos PR… | canonical_product | PROPOSED: move + relabel | lifeos product-owner / Chair | No |
| CARC-002-E-02 | `docs/LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` | Product SSOT for LifeOS conversation evidence subsystem. | canonical_product | PROPOSED: move + relabel | lifeos product-owner / Chair | No |
| CARC-002-E-03 | `docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md` | Filename contains SSOT; content is an amendment build-readiness audit. | historical_only / operational_audit | PROPOSED: rename | Chair / mechanical | No |
| CARC-002-E-04 | `prompts/00-SSOT-READ-SEQUENCE.md` | Filename contains SSOT; it is an agent/system read-order prompt. | canonical_operational (read-order prompt) | PROPOSED: rename | Chair / mechanical | No |
| CARC-002-F-01 | `builderos-reboot/PSSOT_VOCABULARY.md` | Filename contains PSSOT (proposed SSOT). | historical_only / candidate | PROPOSED: move or rename | Chair / mission owner | No |
| CARC-002-F-02 | `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT*.md` | Mission-local files with PSSOT/SSOT in filenames. | historical_only / mission_content | PROPOSED: move or rename | mission owner / Chair | No |
| CARC-002-F-03 | `docs/conversation_dumps/by-product/sessions/*/GOVERNANCE-SSOT.md` | Filename contains GOVERNANCE-SSOT. | historical_only | PROPOSED: retain in place | Historian | No |
| CARC-002-G-01 | `Relationship: BP_PRIORITY.json ↔ PRODUCT_BUILD_PRIORITY.json` | Both files order products. | BP_PRIORITY = canonical_operational (machine queue); PRODUCT_BUILD_PRIORITY = canonical_operational (founder business priority input) | PROPOSED: document relationship | mechanical / Chair | No |

## Approval instructions

1. Review each row against the evidence in `CLASSIFICATION_REPORT.md`.
2. Change `PROPOSED:` disposition to a final value: `retain`, `relabel`, `rewrite`, `supersede`, `move`, `merge`, or `delete`.
3. Set `move_authorized` to `true` for rows approved to execute in CARC-003.
4. Run `npm run builder:preflight` and `npm run lifeos:bp-priority:verify` after any JSON edit.

## Full machine-readable lock

See `DISPOSITION_LOCK.json` for the complete row data including active consumers, active replacement, required verification, and rollback.
