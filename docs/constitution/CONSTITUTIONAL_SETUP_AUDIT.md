<!-- SYNOPSIS: Constitutional setup audit — files claiming canonical/SSOT authority that do not fit the constitutional namespace -->

# Constitutional Authority / SSOT Fit Audit

## How this was generated

- Parsed the first 25 lines of every `.md` file for `Status: CANONICAL`.
- Parsed `_authority.status` / `authority.status` of every `.json` file.
- Allowed canonical namespaces are:
  - `docs/constitution/*`
  - `docs/products/PRODUCT_REGISTRY.json`, `AUTHORITY_BOUNDARIES.md`, `CANONICAL_PRODUCT_HOME_RULES.md`, `INDEX.md`
  - `docs/products/<id>/PRODUCT_HOME.md` and `FILE_MANIFEST.json` for registered product_ids only
  - `builderos-reboot/AGENTS.md`, `BP_PRIORITY.json`, `HIST_DOMAIN_REGISTRY.json`
  - `data/constitutional-framework/REGISTRY.json`, `ENFORCEMENT_MATRIX.json`
  - `docs/TOP_10_PATH_TO_10.json`
- Cross-checked every registered product home for a valid Constitutional law field, existing FILE_MANIFEST, and no active references to forbidden legacy interfaces.

## Findings

| File | Severity | Issue |
|---|---|---|
| data/constitutional-framework/RESEARCH_REGISTRY.json | error | JSON _authority/authority declares status: CANONICAL but path is not in an allowed canonical namespace |
| data/lenses/LENS_REGISTRY.json | error | JSON _authority/authority declares status: CANONICAL but path is not in an allowed canonical namespace |
| docs/products/command-center/PRODUCT_HOME.md | error | Active (non-redirect / non-archive) reference to forbidden legacy file: public/overlay/command-center.html |
| docs/products/command-center/PRODUCT_HOME.md | error | Active (non-redirect / non-archive) reference to forbidden legacy file: public/overlay/lifeos-command-center.html |
| docs/products/command-center/PRODUCT_HOME.md | error | Active (non-redirect / non-archive) reference to forbidden legacy file: public/overlay/lifeos-voice-rail-v1.html |
| docs/products/lifeos/PRODUCT_HOME.md | error | Active (non-redirect / non-archive) reference to forbidden legacy file: public/overlay/lifeos-backtest.html |
| docs/products/lifeos/PRODUCT_HOME.md | error | Active (non-redirect / non-archive) reference to forbidden legacy file: public/overlay/lifeos-voice-rail-v1.html |
| docs/products/lip/PRODUCT_HOME.md | error | PRODUCT_HOME.md exists but product_id 'lip' is not in PRODUCT_REGISTRY.json |
| docs/products/PRODUCT_BUILD_PRIORITY.json | error | JSON _authority/authority declares status: CANONICAL but path is not in an allowed canonical namespace |
| docs/products/project-governance/PRODUCT_HOME.md | error | Active (non-redirect / non-archive) reference to forbidden legacy file: public/overlay/lifeos-command-center.html |
| docs/TCO_ANNEX.md | error | Self-declares Status: CANONICAL in first 25 lines but is not in an allowed canonical namespace |
| builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT_BPB_READINESS.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT_REFINEMENT_REPORT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT_TO_BLUEPRINT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| builderos-reboot/PSSOT_VOCABULARY.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/COMPLETION_VOCABULARY_SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/2a4739f2/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/34afb0d1/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/48f2917e/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/7449d204/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/7dc85f20/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/a70380f7/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/bc7e829e/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/d5421079/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/conversation_dumps/by-product/sessions/e9b7659e/GOVERNANCE-SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/history/constitution/SSOT_NORTH_STAR_path_archived_2026-06-29.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/LIFEOS_CONVERSATION_EVIDENCE_SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/LIFEOS_PROGRAM_MAP_SSOT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |
| prompts/00-SSOT-READ-SEQUENCE.md | warning | Filename claims SSOT/Single-Source-of-Truth but file is not in an allowed canonical namespace |

**Total:** 31 findings (11 errors, 20 warnings)
