<!-- SYNOPSIS: Non-destructive authority-chain classification for constitutional/active-reality consolidation. No files were moved, renamed, archived, or deleted to produce this report. -->

# CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001 — Classification Report

**Mission:** `CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001`  
**Product:** `builderos`  
**Scope:** Identify files that claim constitutional, canonical, or SSOT authority but do not fit the active constitutional/authority model; classify by authority chain; extract valuable unrepresented ideas.  
**Date:** 2026-08-04  
**Sources read:** `docs/constitution/NORTH_STAR_SSOT.md` (full, this session), `docs/products/AUTHORITY_BOUNDARIES.md`, `docs/products/CANONICAL_PRODUCT_HOME_RULES.md`, `docs/products/PRODUCT_REGISTRY.json`, `data/constitutional-framework/ENFORCEMENT_MATRIX.json`, `data/constitutional-framework/REGISTRY.json`, `data/constitutional-framework/RESEARCH_REGISTRY.json`, `data/lenses/LENS_REGISTRY.json`, `docs/products/PRODUCT_BUILD_PRIORITY.json`, `docs/TCO_ANNEX.md`, `docs/products/lip/PRODUCT_HOME.md`, `docs/products/command-center/PRODUCT_HOME.md`, `docs/products/lifeos/PRODUCT_HOME.md`, `docs/products/project-governance/PRODUCT_HOME.md`, `.cursor/rules/legacy-interfaces-forbidden.mdc`, `builderos-reboot/AGENTS.md`.

---

## 1. Authority model used for this report

Authority is **scoped**, not binary. A file can be `CANONICAL` for a narrow operational question without being constitutional law.

| Dimension | What can grant it | Where it may live | How it is amended / superseded |
|---|---|---|---|
| `constitutional_supreme` | `docs/constitution/NORTH_STAR_SSOT.md` only; amendments per Article VII | `docs/constitution/NORTH_STAR_SSOT.md` | Article VII process |
| `canonical_governance` | Constitutional ratification or explicit delegation in North Star / `CONSTITUTIONAL_FRAMEWORK_v1.md` | `docs/constitution/CONSTITUTIONAL_FRAMEWORK_v1.md`, `CONSTITUTIONAL_PROCESSES.md`, `data/constitutional-framework/REGISTRY.json`, `ENFORCEMENT_MATRIX.json` | Amendment / council debate / new evidence |
| `canonical_operational` | Founder business decision or explicit runtime delegation; subordinate to North Star and product homes | `builderos-reboot/BP_PRIORITY.json`, `docs/products/PRODUCT_BUILD_PRIORITY.json`, `data/constitutional-framework/RESEARCH_REGISTRY.json`, `data/lenses/LENS_REGISTRY.json`, runtime data registries | PB approval, chair/council review, reality calibration |
| `canonical_product` | `docs/products/PRODUCT_REGISTRY.json` plus one `PRODUCT_HOME.md` + `FILE_MANIFEST.json` per product | `docs/products/<id>/PRODUCT_HOME.md`, `FILE_MANIFEST.json` | Product owner / Founder |
| `canonical_generated_artifact` | Output of a governed mission; subordinate to its blueprint and product home | `builderos-reboot/MISSIONS/<id>/OBJECTIVE_VERDICT.json`, acceptance receipts, `CONTENT/` snapshots | New mission / re-verification |
| `historical_only` | None for current authority; preserved for provenance, learning, Digital Twins | `docs/history/`, `docs/conversation_dumps/`, `builderos-reboot/HIST_DOMAIN_REGISTRY.json` items, archives | Historian process; must not influence runtime |

**Key rule from `NORTH_STAR_SSOT.md` §2.0M:** "Candidate principles and provisional theories live in the Constitutional Research Registry and are not themselves authority levels."  
**Key rule from `AUTHORITY_BOUNDARIES.md`:** Law/history anchors (amendments, mission `FOUNDER_PACKET`s, mission `CONTENT` copies, change receipts, gap audits, conversation dumps) are **not** primary product homes unless explicitly declared `CANONICAL` by the registry or constitution.

---

## 2. Methodology and scan scope

This report is a **first-pass discovery scan**, not an exhaustive mechanical proof of every file in the repository. Completeness is bounded as follows:

### 2.1 Search vocabulary and patterns

| Target | Patterns / fields searched | Why |
|---|---|---|
| Markdown authority claims | First 25 lines scanned for `Status: CANONICAL`, `SSOT`, `single source of truth`, `canonical`, `supreme`, `non-negotiable`, `immutable`, `ratified`, `governs`, `supersedes`, `cannot be overridden`, `LOCKED` | Catch self-declared canonical/SSOT claims. |
| JSON authority claims | `_authority.status`, `authority.status`, `_authority.domain` | Catch registry-level canonical declarations. |
| Forbidden legacy overlay references | `public/overlay/command-center.html`, `lifeos-command-center.html`, `lifeos-backtest.html`, `lifeos-voice-rail-v1.html`, `lifeos-alpha.html`, `control.html`, `portal.html`, `lifeos-founder-interface.html`, `lifeos-communication.html` | Catch product homes still pointing to retired surfaces. |
| Active consumers | `grep` for each file path, stem, and relevant route/module names across `routes/`, `services/`, `scripts/`, `public/overlay/`, `package.json`, `docs/products/*/PRODUCT_HOME.md` | Determine whether a claim is reachable by code, read order, or agent walk. |
| Product registration | `PRODUCT_REGISTRY.json` `product_id` list, `bp_priority_mission_ids`, `FILE_MANIFEST.json` | Cross-check product-home existence vs. canonical registry. |

### 2.2 Repository scale scanned

- **Markdown files:** 5,178 (excluding `node_modules`)
- **JSON files:** 2,770 (excluding `node_modules`)
- **Files with `status: CANONICAL` in JSON:** 11 (after deduplication)
- **Markdown files self-declaring `CANONICAL`/`SSOT` in the first 25 lines:** 3 (plus ~20 filename-only candidates)
- **Forbidden legacy overlay references found in canonical product homes:** 3 product homes, 5 distinct legacy file names

### 2.3 What "complete" means for CARC-001

CARC-001 is **complete** when:

1. An authority-dimension model is defined.
2. Every authority-bearing artifact discovered in a first-pass scan is classified with: exact claim, claimed scope, granting source, active consumers, runtime reachability, conflicts, and recommended disposition.
3. Valuable unrepresented principles are captured in the `CONSTITUTIONAL_CANDIDATE_LEDGER.md`.
4. No active files are moved, renamed, archived, or deleted.

CARC-001 is **not** a guarantee that every impostor in the repository has been found. It is the required evidence base for the `DISPOSITION_LOCK` (CARC-002). A deeper second-pass scan can be authorized after CARC-002 if the disposition lock uncovers additional candidates.

### 2.4 Scope deviation recorded separately

The originally announced output for this phase was an *Idea Lifecycle Registry* and an *institutional-maturity dashboard*. Those artifacts are **not** in this deliverable. This mission instead executed CARC-001 (classification and candidate extraction) first. The deviation is recorded in `SCOPE_DEVIATION.md` and the registry/dashboard are now CARC-005.

---

## 3. Findings by category

### A. Unearned constitutional / SSOT authority claims

| File | `docs/TCO_ANNEX.md` |
|---|---|
| **Exact claim** | Line 3: `SSOT ANNEX — TOTALCOSTOPTIMIZER (TCO)`; line 5: `Status: Canonical Annex (referenced by North Star; does not override Constitution)`. |
| **Claimed scope** | Canonical / SSOT annex for total-cost-optimization mechanisms. |
| **Granting source** | **THINK:** Not referenced in `NORTH_STAR_SSOT.md` §2.0M or any Article. `PRODUCT_REGISTRY.json` lists `api-cost-savings` as the product; its `law_path` is `docs/products/api-cost-savings/PRODUCT_HOME.md`. No grep hit for `TCO_ANNEX` in `docs/products/api-cost-savings/` or active runtime code. |
| **Active consumers** | `REPO_CATALOG.md` (index entry), `TCO_SYSTEM_STATUS_REPORT.md` (status report reference), `docs/history/legacy-history-salvage/docs-projects-root/TCO_TSOS_75_PERCENT_SAVINGS_BRAINSTORM.md`, `docs/conversation_dumps/raw/cursor-d5421079-*.jsonl`, `REPO_FILE_SYNOPSIS_INDEX.json` (auto-index). No runtime `import` or route handler reads this file directly. |
| **Runtime reachability** | The annex itself is not mounted or read by runtime. It may still be read by cold agents because it lives at repo root under `docs/`. |
| **Conflict** | Claims "Canonical Annex" and "SSOT" without a delegation chain from North Star or the owning product home. |
| **Unique value preserved** | 40+ concrete TCO mechanisms (token/context reduction, model routing, compression/drift protection, overhead control, proof/trust guarantees, autonomous agents, pricing/business models, moats). Many overlap with `api-cost-savings` `PRODUCT_HOME.md` and `TCO_TSOS_75_PERCENT_SAVINGS_BRAINSTORM.md`, but the annex has a cleaner structured taxonomy and anti-sprawl "ACTIVE BUILD CAP" rule. |
| **Correct disposition** | Extract unique TCO mechanisms into `docs/products/api-cost-savings/PRODUCT_HOME.md` or a scoped operational spec, then **move** the annex to `docs/history/` or `docs/products/api-cost-savings/history/` with a supersession receipt. Do not leave a forwarding re-export that keeps it active. |
| **What breaks if authority removed** | Nothing in runtime. Cold agents may lose a TCO summary unless the content is preserved in the product home or history. |
| **Action owner** | `api-cost-savings` product-owner / Founder. |

---

### B. Legitimate scoped canonical sources with limited scope (false positives in the prior audit)

These files use `CANONICAL` or `SSOT` in a way that overclaims at first glance but is appropriate for a narrow operational domain. The fix is **scope labeling**, not deletion.

| File | `data/constitutional-framework/RESEARCH_REGISTRY.json` |
|---|---|
| **Exact claim** | `"authority": {"domain": "Research", "status": "CANONICAL", "note": "Candidates and provisional theories — not governing authority until promoted..."}` |
| **Claimed scope** | Research registry **container** for candidate principles and provisional theories. |
| **Granting source** | `NORTH_STAR_SSOT.md` §2.0M explicitly ratifies it: "the research registry for candidates and provisional theories is `data/constitutional-framework/RESEARCH_REGISTRY.json`"; `CONSTITUTIONAL_FRAMEWORK_v1.md` line 225 repeats this. |
| **Active consumers** | `scripts/constitutional-framework.mjs` (reads/promotes), `scripts/verify-constitutional-architecture-acceptance.mjs` (verification). |
| **Runtime reachability** | CLI/verification scripts; not runtime API. |
| **Conflict** | Binary "CANONICAL" label caused the first-pass audit to treat it as an unearned constitutional authority claim. The file itself says contents are not governing. This is a **container vs. content** confusion, not an impostor. |
| **Correct disposition** | **Relabel**, not move. Update `_authority` to include `scope: "canonical container; entries are provisional until promoted"` and ensure `AUTHORITY_BOUNDARIES.md` lists `data/constitutional-framework/REGISTRY.json` and `RESEARCH_REGISTRY.json` as canonical constitutional data registries. |
| **What breaks if authority removed** | Constitutional research workflow breaks; candidate principles would have no canonical staging area. |
| **Action owner** | mechanical. |

| File | `data/lenses/LENS_REGISTRY.json` |
|---|---|
| **Exact claim** | `"_authority": {"domain": "Machine", "status": "CANONICAL", "role": "Catalog of reusable cognitive assets (lenses).", "spec": "docs/products/builderos/specs/COGNITIVE_ASSET_ARCHITECTURE.md"}` |
| **Claimed scope** | Catalog of reusable cognitive assets (lenses). |
| **Granting source** | `docs/constitution/AMENDMENT_COGNITIVE_LAYERS.md` line 50 lists it as "canonical lens catalog"; `docs/products/builderos/PRODUCT_HOME.md` change receipts reference it; runtime services consume it. |
| **Active consumers** | `services/wisdom-reality-update.mjs`, `services/cognitive-chair.mjs`, `scripts/wisdom-update-lens-trust.mjs`. |
| **Runtime reachability** | Runtime service reads/writes lens trust scores. |
| **Conflict** | Lives in `data/lenses/`, outside the first-pass audit's canonical namespace list, but it has an explicit constitutional amendment and product spec backing it. It is a **product/operational canonical** source, not constitutional law. |
| **Correct disposition** | **Relabel**, not move. Add `data/lenses/LENS_REGISTRY.json` to `AUTHORITY_BOUNDARIES.md` as canonical operational data (or move it under `docs/products/builderos/data/`). Update `_authority.scope` to clarify it is a product catalog, not constitutional law. |
| **What breaks if authority removed** | Cognitive-chair lens selection and wisdom trust updates lose their registry. |
| **Action owner** | `builderos` product-owner / mechanical. |

| File | `docs/products/PRODUCT_BUILD_PRIORITY.json` |
|---|---|
| **Exact claim** | `"_authority": {"domain": "Product", "status": "CANONICAL", "owner": "Founder (Adam)", "purpose": "Founder-owned financial priority order for the autonomous product-build loop..."}` |
| **Claimed scope** | Founder-owned financial priority order for the autonomous build loop. |
| **Granting source** | Founder notes inside the file (2026-07-12, 2026-07-29) and active consumption by `services/governed-autonomous-shipping-loop.js` (cited in `docs/products/builderos/PRODUCT_HOME.md` change receipt). |
| **Active consumers** | `services/governed-autonomous-shipping-loop.js` (orders products by this file), `services/never-stop-product-factory.js`, `public/overlay/money-lane.html`, `docs/products/lifeos/PRODUCT_HOME.md`, `docs/products/command-center/PRODUCT_HOME.md`, `docs/products/builderos/BUILD_QUEUE.json`, `docs/products/limitlessos/PRODUCT_HOME.md`. |
| **Runtime reachability** | Runtime autonomous shipping loop uses it. |
| **Conflict** | `AUTHORITY_BOUNDARIES.md` active product truth layers do not list `PRODUCT_BUILD_PRIORITY.json`, yet it is a real operational canonical source. It is subordinate to `BP_PRIORITY.json` (machine queue) and `PRODUCT_REGISTRY.json` (product homes). |
| **Correct disposition** | **Relabel / document**, not delete. Add `docs/products/PRODUCT_BUILD_PRIORITY.json` to `AUTHORITY_BOUNDARIES.md` as `Founder business priority (operational canonical, subordinate to BP_PRIORITY.json)`. Clarify relationship to `BP_PRIORITY.json` in the file. |
| **What breaks if authority removed** | Autonomous shipping loop loses founder financial ordering; likely falls back to maturity-based ordering. |
| **Action owner** | mechanical / Founder. |

| File | `docs/COMPLETION_VOCABULARY_SSOT.md` + `builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.json` |
|---|---|
| **Exact claim** | Header: "**Status:** `LOCKED` v1.0" and "**Authority:** Language law for receipts, cert JSON, readiness reports, Chair prose, CI overclaim guards." |
| **Claimed scope** | Completion/status claim vocabulary for BuilderOS receipts. |
| **Granting source** | **THINK:** No direct citation in `NORTH_STAR_SSOT.md` or `AUTHORITY_BOUNDARIES.md`. However, it has a locked machine instance (`builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.json`) and is consumed by runtime. |
| **Active consumers** | `services/completion-overclaim-guard.js` (reads JSON), `services/founder-usability-verdict.js` (reads JSON), `scripts/verify-completion-overclaim.mjs`, `public/overlay/lifeos-app.html` (line 3027 references markdown), `docs/products/lifeos/PRODUCT_HOME.md` (change receipts). |
| **Runtime reachability** | Runtime verification guard and UI reference the vocabulary. |
| **Conflict** | Root-level `docs/COMPLETION_VOCABULARY_SSOT.md` filename and `SSOT` framing imply supreme authority; it is actually a **scoped BuilderOS operational vocabulary**. The machine copy already lives under `builderos-reboot/governance/` where it belongs. |
| **Correct disposition** | **Relabel / relocate**. Move markdown to `builderos-reboot/governance/COMPLETION_VOCABULARY.md` (or `docs/products/builderos/specs/`) next to its JSON, update active references, and add it to `AUTHORITY_BOUNDARIES.md` as `BuilderOS completion vocabulary (operational canonical)`. |
| **What breaks if authority removed** | Runtime overclaim guard and founder-usability verdict lose their vocabulary source; CI receipts could drift. |
| **Action owner** | `builderos` product-owner / mechanical. |

---

### C. Registry / owner conflicts

| File | `docs/products/lip/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Metadata table: `**Product id** | \`lip\``; `**Canonical home** | this file`; `**Constitutional law** | docs/constitution/NORTH_STAR_SSOT.md`; `**Machine manifest** | docs/products/lip/FILE_MANIFEST.json`. |
| **Claimed scope** | Canonical product home for Limitless Investment Protocol. |
| **Granting source** | `docs/products/CANONICAL_PRODUCT_HOME_RULES.md` requires each product to be listed in `PRODUCT_REGISTRY.json`. `PRODUCT_REGISTRY.json` does **not** contain a `lip` entry. `limitlessos` is registered. |
| **Active consumers** | `docs/products/lip/FILE_MANIFEST.json`, `package.json` (`lip:*` scripts: `lip:seed`, `lip:scan`, `lip:backtest`, `lip:paper`, `lip:live-paper`, and 14 blind-sim scripts), `scripts/lip/*` (27+ scripts), `tests/lip-limitless-protocol.test.js`. |
| **Runtime reachability** | `npm run lip:*` is reachable from the shell. No evidence found of mounted HTTP routes under `/api/v1/lip` or similar in the scanned routes. |
| **Conflict** | Product home and manifest exist but product is unregistered. Either the registry is stale or the product home was created outside the canonical registration path. |
| **Evidence for each option** | **(a) Active product omitted:** 27 scripts, `FILE_MANIFEST.json`, active sim/test commands. **(b) Abandoned/folded into `limitlessos`:** `limitlessos` is the registered business-stack product and `lip` could be a sub-experiment. **(c) Registry stale:** `PRODUCT_REGISTRY.json` `limitlessos.bp_priority_mission_ids` is empty and `lip` scripts are not in `BP_PRIORITY.json`. |
| **Correct disposition** | **Founder/business decision:** (1) register `lip` as a standalone product in `PRODUCT_REGISTRY.json` with `limitlessos` as related parent or business unit; or (2) fold `lip` into `docs/products/limitlessos/PRODUCT_HOME.md` and move `docs/products/lip/` to `docs/products/limitlessos/lip/` or `docs/history/`. |
| **What breaks if authority removed** | If `lip` runtime scripts are active, folding without updating `package.json` / `FILE_MANIFEST.json` references would break them. If `lip` is abandoned, leaving the home unregistered creates a phantom authority surface. |
| **Action owner** | Founder. |

---

### D. Historical contamination / stale references in canonical product homes

These product homes are themselves registered in `PRODUCT_REGISTRY.json` and are legitimate canonical product homes, **but they still point to forbidden legacy overlay files as if they were active surfaces**. This is a contamination finding, not an impostor-authority finding.

| File | `docs/products/command-center/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Lines 79-84: `public/overlay/command-center.html` ← operational admin dashboard (do not replace); `public/overlay/lifeos-command-center.html` ← NEW: executive oversight cockpit (v2); `public/overlay/c2-mission-dashboard.html` ← NEW. |
| **Claimed scope** | Active UI surfaces for command-center features. |
| **Granting source** | `.cursor/rules/legacy-interfaces-forbidden.mdc` declares `command-center.html` and `lifeos-command-center.html` forbidden and dead; the only active founder interface is `public/overlay/lifeos-app.html`. Change receipts in the same file confirm `routes/public-routes.js` redirects those paths to `/lifeos?direct_system=1`. |
| **Active consumers** | Product home is a cold-agent read. `routes/public-routes.js` redirects the legacy paths at runtime, so the legacy files are not served as primary entrypoints. **Physical files still on disk:** `public/overlay/command-center.html` and `public/overlay/lifeos-command-center.html` exist as of this scan. |
| **Runtime reachability** | Legacy HTML files are not reachable as primary surfaces; `routes/public-routes.js` redirects them. `routes/command-center-routes.js` and `routes/lifeos-command-center-routes.js` still provide API endpoints. |
| **Conflict** | Canonical product home describes forbidden legacy overlays as operational / new surfaces. A cold agent building from this home could recreate dead files. |
| **Correct disposition** | **Product home:** replace active references with `public/overlay/lifeos-app.html` and the relevant API routes. **On disk:** move `public/overlay/command-center.html` and `public/overlay/lifeos-command-center.html` to `docs/history/legacy-overlays/` or delete, while keeping redirects in `routes/public-routes.js`. |
| **What breaks if authority removed** | Nothing in runtime. Cold-agent guidance improves. |
| **Action owner** | `command-center` / `lifeos` product-owner / Builder. |

| File | `docs/products/lifeos/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Line 990: `public/overlay/lifeos-backtest.html` renders the results with a permanent red **EDUCATION ONLY** banner. Additional `lifeos-voice-rail-v1.html` references in change receipts about redirects. |
| **Claimed scope** | Active UI surface for backtest visualization. |
| **Granting source** | `.cursor/rules/legacy-interfaces-forbidden.mdc` declares `lifeos-backtest.html` experimental and never shipped; `public/overlay/lifeos-app.html` is the only active founder interface. The backtest data is exposed via `routes/lifeos-backtest-routes.js` `/api/v1/lifeos/backtest/*` (read-only API). |
| **Active consumers** | Product home; `routes/lifeos-backtest-routes.js` API. `public/overlay/lifeos-backtest.html` **does not exist on disk**. |
| **Runtime reachability** | `lifeos-backtest.html` is forbidden; the API is mounted. `lifeos-voice-rail-v1.html` is redirected in `routes/public-routes.js` line 150 and does not exist on disk. |
| **Conflict** | Product home describes a forbidden HTML overlay as the rendering surface for a live API. |
| **Correct disposition** | Replace `public/overlay/lifeos-backtest.html` reference with the API endpoints and `lifeos-app.html` integration (if any). For `lifeos-voice-rail-v1.html`, ensure references are only in redirect/archive context; if active, replace with `/lifeos` and `lifeos-app.html`. |
| **What breaks if authority removed** | Nothing in runtime. API remains reachable. |
| **Action owner** | `lifeos` product-owner / Builder. |

| File | `docs/products/project-governance/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Line 186 active task list: `Wire estimation accuracy, readiness queue, and governance drill-down into the Command Center overlay` → `#project-governance-panel` in `lifeos-command-center.html` Section F. Line 297 change receipt repeats the same. |
| **Claimed scope** | Active UI surface for project-governance drill-down. |
| **Granting source** | `.cursor/rules/legacy-interfaces-forbidden.mdc` declares `lifeos-command-center.html` forbidden and replaced; change receipt (line 1964 of `docs/products/lifeos/PRODUCT_HOME.md`) states legacy overlays were archived and redirect to `/lifeos?direct_system=1`. |
| **Active consumers** | Product home; `routes/project-governance-routes.js` API (runtime endpoints listed in Anti-Drift Assertions). |
| **Runtime reachability** | `lifeos-command-center.html` is forbidden. |
| **Conflict** | Active product backlog instructs building into a retired overlay. |
| **Correct disposition** | Replace `lifeos-command-center.html` with `public/overlay/lifeos-app.html` or the project-governance API endpoints. Update or archive the stale task. |
| **What breaks if authority removed** | Nothing in runtime. |
| **Action owner** | `project-governance` / `lifeos` product-owner / Builder. |

---

### E. Active SSOT-filename artifacts that are legitimate but misplaced

These files are **active** (real consumers, real read order, or real runtime impact) but their filenames or root-level locations claim SSOT/canonical authority without a clear scoped grant. They should be relabeled or relocated, not deleted.

| File | Active consumers | Why it is a misfit | Recommended disposition |
|---|---|---|---|
| `docs/LIFEOS_PROGRAM_MAP_SSOT.md` | `docs/QUICK_LAUNCH.md`, `docs/products/lifeos/PRODUCT_HOME.md` (4 change-receipt refs), `public/overlay/lifeos-app.html`, `scripts/lifeos-builder-continuous-queue.mjs`, `docs/REPO_MASTER_INDEX.md`, `docs/REPO_CATALOG.md` | Claims "canonical SSOT hub" for LifeOS but lives in `docs/` root, not under `docs/products/lifeos/`. Not referenced in `AUTHORITY_BOUNDARIES.md`. | Move to `docs/products/lifeos/PROGRAM_MAP.md` (or `LIFEOS_PROGRAM_MAP.md` under product home), add to `AUTHORITY_BOUNDARIES.md` as product-level canonical, update all references. |
| `docs/LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` | `docs/LIFEOS_PROGRAM_MAP_SSOT.md` line 111, `docs/architecture/{TRUTH_SYSTEM_ARCHITECTURE.md,MEMORY_ARCHITECTURE_ARCHAEOLOGY.md,PERSONAL_MEMORY_ARCHITECTURE.md}` | Product SSOT for LifeOS conversation evidence subsystem but in `docs/` root. Self-aware ("This is a product SSOT, not BuilderOS governance law"), but location is wrong. | Move to `docs/products/lifeos/CONVERSATION_EVIDENCE.md` and update references; add to `AUTHORITY_BOUNDARIES.md` as product canonical. |
| `docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md` | `prompts/00-SSOT-READ-SEQUENCE.md` (B5), `docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md` change receipts | Filename claims SSOT; content is an **audit** ("Honest check..."). It is in active read order. | Rename to `docs/AMENDMENT_BUILD_READINESS_AUDIT.md` (or `docs/history/AMENDMENT_BUILD_READINESS_AUDIT_2026-04-25.md` if stale), update `00-SSOT-READ-SEQUENCE.md` and product-home references. |
| `prompts/00-SSOT-READ-SEQUENCE.md` | `routes/lifeos-council-builder-routes.js`, `scripts/generate-cold-start.mjs`, `docs/products/lifeos/PRODUCT_HOME.md`, `docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md`, `docs/REPO_CATALOG.md`, `docs/SSOT_DUAL_CHANNEL.md` | A **read-order prompt** with `SSOT` in its name. It is not a source of truth; it points to sources of truth. | Rename to `prompts/00-READ-SEQUENCE.md`, update all references, and ensure `scripts/generate-cold-start.mjs` and `routes/lifeos-council-builder-routes.js` point to the new name. |

---

### F. Filename-only / historical SSOT candidates (warnings, not proven authority violations)

These files contain `SSOT` or `Single-Source-of-Truth` in their names. Filename alone is insufficient to prove active authority. Most are already historical, mission-local, or proposed.

| Location / pattern | Count | Active consumers found | Likely nature | Recommended action |
|---|---|---|---|---|
| `builderos-reboot/PSSOT_VOCABULARY.md` | 1 | `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/README.md`, `builderos-reboot/HANDOFF.md`, conversation dumps | Proposed mission-local vocabulary | Move to `docs/history/` or the owning mission's `CONTENT/`; rename to remove `PSSOT` if kept active. |
| `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT*.md` | 4 | Mission folder only | Mission artifacts / content snapshots | Review for unique ideas → move to `docs/history/` or mission `CONTENT/` with `PROPOSED` banner; rename. |
| `docs/history/constitution/SSOT_NORTH_STAR_path_archived_2026-06-29.md` | 1 | History only | Archived file with explicit `archived` in name | Keep as-is in history; filename retention is acceptable because it is clearly historical. |
| `docs/conversation_dumps/by-product/sessions/*/GOVERNANCE-SSOT.md` | ~10 | Conversation-dump folders only | Conversation evidence / consensus notes | Keep as-is while in `conversation_dumps/`; rename if ever moved out of the dump folder. |

**Excluded from warnings (legitimate scoped SSOT references):**
- `docs/SSOT_COMPANION.md` and `docs/SSOT_DUAL_CHANNEL.md` — explicitly referenced by `NORTH_STAR_SSOT.md` read chain and hierarchy as operational companion documents.

---

### G. Confirmed duplicate active authorities

No two files were found claiming **exactly identical constitutional or product scope** as active authority. Two near-duplicate relationships require documentation:

1. `builderos-reboot/BP_PRIORITY.json` (machine queue) and `docs/products/PRODUCT_BUILD_PRIORITY.json` (founder financial priority) both order products. They are **not** duplicates — one is the active execution queue, the other is the founder's business-priority input — but the relationship must be explicit to avoid cold agents confusing them. Recommendation: add a cross-reference note in both files.

2. `docs/COMPLETION_VOCABULARY_SSOT.md` (human-readable) and `builderos-reboot/governance/COMPLETION_VOCABULARY_SSOT.json` (machine-readable) are the same vocabulary in two formats. The JSON is the runtime surface; the markdown is the human companion. If the markdown is moved, the JSON path should stay or a supersession receipt must redirect active code.

---

## 4. Completeness, limitations, and what this report does not claim

### 4.1 This report does not claim to have found every impostor

The scan was a **first pass** over the repository using the vocabulary and file counts above. It focused on:

- Self-declared `CANONICAL`/`SSOT` claims in Markdown first-25 lines and JSON `_authority` blocks.
- Forbidden legacy overlay references in canonical product homes.
- Product-home / `PRODUCT_REGISTRY.json` mismatches.
- Filename-level `SSOT` patterns.

It did **not** exhaustively trace every `import`, every agent read-order, every `docs/` root file, every conversation dump, or every `builderos-reboot/_hist/` snapshot. A second pass can be authorized after `DISPOSITION_LOCK.json` (CARC-002) is approved.

### 4.2 Every classification is evidence-linked but not independently proven

Each row cites the files searched and the grep results used. Where the finding says **THINK**, it is an inference with rationale, not a verified fact. The `DISPOSITION_LOCK` (CARC-002) must be reviewed by a human/Chair before any move, relabel, or archive.

### 4.3 No active files were moved, renamed, archived, or deleted

This report and the attached `CONSTITUTIONAL_CANDIDATE_LEDGER.md`, `SCOPE_DEVIATION.md`, `OBJECTIVE_VERDICT.json`, and `DISPOSITION_LOCK.json` are the only artifacts produced in CARC-001. No source file has been altered.

---

## 5. Summary counts

| Category | Unique files | Disposition recommendation |
|---|---|---|
| A. Unearned constitutional/SSOT claim | 1 (`docs/TCO_ANNEX.md`) | Integrate + archive / move to history |
| B. Legitimate scoped canonical (needs clearer scope label or relocation) | 4 (`RESEARCH_REGISTRY.json`, `LENS_REGISTRY.json`, `PRODUCT_BUILD_PRIORITY.json`, `COMPLETION_VOCABULARY_SSOT.md`) | Relabel / document scope / relocate; keep active |
| C. Registry/owner conflict | 1 (`docs/products/lip/PRODUCT_HOME.md`) | Register or fold into `limitlessos` — Founder decision |
| D. Historical contamination in product homes (+ physical legacy files) | 3 product homes (`command-center`, `lifeos`, `project-governance`) + 2 physical HTML files still on disk | Replace forbidden legacy references with `lifeos-app.html`/API; move/delete retired HTML files |
| E. Active SSOT-filename artifacts misplaced | 4 (`LIFEOS_PROGRAM_MAP_SSOT.md`, `LIFEOS_CONVERSATION_EVIDENCE_SSOT.md`, `SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md`, `prompts/00-SSOT-READ-SEQUENCE.md`) | Relocate/rename and update references |
| F. Filename-only / historical SSOT candidates | ~15 | Review; mostly historical/mission-local; likely archive/rename |
| G. Duplicate / near-duplicate active authorities | 0 exact duplicates; 2 relationships to document | Document relationship / keep both with cross-reference |

---

## 6. Next step

CARC-001 is complete. The next step is **CARC-002 — Founder review and disposition lock**. A draft `DISPOSITION_LOCK.json` (and human-readable `DISPOSITION_LOCK.md`) is provided for review.
