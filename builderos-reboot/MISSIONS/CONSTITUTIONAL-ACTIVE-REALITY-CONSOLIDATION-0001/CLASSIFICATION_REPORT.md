<!-- SYNOPSIS: Non-destructive authority-chain classification for constitutional/active-reality consolidation. No files were moved, renamed, or deleted to produce this report. -->

# CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001 — Classification Report

**Mission:** `CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001`  
**Product:** `builderos`  
**Scope:** Identify every file that claims constitutional, canonical, or SSOT authority but does not fit the active constitutional/authority model; classify by authority chain; extract valuable unrepresented ideas.  
**Method:** Derive authority rules from currently recognized higher sources; scan first 25 lines of `.md` and `_authority`/`authority` blocks of `.json`; trace active consumers and runtime reachability with `grep`; do **not** move, rename, archive, or delete anything.  
**Date:** 2026-08-04  
**Sources read:** `docs/constitution/NORTH_STAR_SSOT.md`, `docs/products/AUTHORITY_BOUNDARIES.md`, `docs/products/CANONICAL_PRODUCT_HOME_RULES.md`, `docs/products/PRODUCT_REGISTRY.json`, `data/constitutional-framework/ENFORCEMENT_MATRIX.json`, `data/constitutional-framework/RESEARCH_REGISTRY.json`, `data/lenses/LENS_REGISTRY.json`, `docs/products/PRODUCT_BUILD_PRIORITY.json`, `docs/TCO_ANNEX.md`, `docs/products/lip/PRODUCT_HOME.md`, `docs/products/command-center/PRODUCT_HOME.md`, `docs/products/lifeos/PRODUCT_HOME.md`, `docs/products/project-governance/PRODUCT_HOME.md`, `.cursor/rules/legacy-interfaces-forbidden.mdc`, `builderos-reboot/AGENTS.md`.

---

## 1. Authority model used for this report

Authority is **scoped**, not binary. A file can be `CANONICAL` for a narrow operational question without being constitutional law.

| Dimension | What can grant it | Where it may live | How it is amended / superseded |
|---|---|---|---|
| `constitutional_supreme` | `docs/constitution/NORTH_STAR_SSOT.md` only; amendments per Article VII (unanimous AI Council + Human Guardian written approval + 7-day review) | `docs/constitution/NORTH_STAR_SSOT.md` | Article VII process |
| `canonical_governance` | Constitutional ratification or explicit delegation in North Star / `CONSTITUTIONAL_FRAMEWORK_v1.md` | `docs/constitution/CONSTITUTIONAL_FRAMEWORK_v1.md`, `CONSTITUTIONAL_PROCESSES.md`, `data/constitutional-framework/REGISTRY.json`, `ENFORCEMENT_MATRIX.json` | Amendment / council debate / new evidence |
| `canonical_operational` | Founder business decision or explicit runtime delegation; subordinate to North Star and product homes | `builderos-reboot/BP_PRIORITY.json`, `docs/products/PRODUCT_BUILD_PRIORITY.json`, `data/constitutional-framework/RESEARCH_REGISTRY.json`, `data/lenses/LENS_REGISTRY.json`, runtime data registries | PB approval, chair/council review, reality calibration |
| `canonical_product` | `docs/products/PRODUCT_REGISTRY.json` plus one `PRODUCT_HOME.md` + `FILE_MANIFEST.json` per product | `docs/products/<id>/PRODUCT_HOME.md`, `FILE_MANIFEST.json` | Product owner / Founder |
| `canonical_generated_artifact` | Output of a governed mission; subordinate to its blueprint and product home | `builderos-reboot/MISSIONS/<id>/OBJECTIVE_VERDICT.json`, acceptance receipts, `CONTENT/` snapshots | New mission / re-verification |
| `historical_only` | None for current authority; preserved for provenance, learning, Digital Twins | `docs/history/`, `docs/conversation_dumps/`, `builderos-reboot/HIST_DOMAIN_REGISTRY.json` items, archives | Historian process; must not influence runtime |

**Key rule from `NORTH_STAR_SSOT.md` §2.0M:** "Candidate principles and provisional theories live in the Constitutional Research Registry and are not themselves authority levels."  
**Key rule from `AUTHORITY_BOUNDARIES.md`:** Law/history anchors (amendments, mission FOUNDER_PACKET, mission CONTENT copies, change receipts, gap audits, conversation dumps) are **not** primary product homes unless explicitly declared `CANONICAL` by the registry or constitution.

---

## 2. Findings by category

### A. Unearned constitutional / SSOT authority claims

| File | `docs/TCO_ANNEX.md` |
|---|---|
| **Exact claim** | Line 3: `SSOT ANNEX — TOTALCOSTOPTIMIZER (TCO)`; line 5: `Status: Canonical Annex (referenced by North Star; does not override Constitution)`. |
| **Claimed scope** | Canonical / SSOT annex for total-cost-optimization mechanisms. |
| **Granting source** | **THINK:** Not referenced in `NORTH_STAR_SSOT.md` §2.0M or any Article. `PRODUCT_REGISTRY.json` lists `api-cost-savings` as the product; its `law_path` is `docs/products/api-cost-savings/PRODUCT_HOME.md`. No grep hit for `TCO_ANNEX` in `docs/products/api-cost-savings/` or active runtime code. |
| **Active consumers** | `public/tco/analyzer.html`, `public/tco/dashboard.html`, `routes/tco-routes.js`, `server-full-runtime.js` implement TCO; none import or display `docs/TCO_ANNEX.md`. |
| **Runtime reachability** | The annex itself is not mounted or read by runtime. It may still be read by cold agents because it lives at repo root under `docs/`. |
| **Conflict** | Claims "Canonical Annex" and "SSOT" without a delegation chain from North Star or the owning product home. |
| **Correct disposition** | Extract unique TCO mechanisms into `docs/products/api-cost-savings/PRODUCT_HOME.md` or an operational spec, then **move** the annex to `docs/history/` or `docs/products/api-cost-savings/history/` with a supersession receipt. Do not leave a forwarding re-export that keeps it active. |
| **What breaks if authority removed** | Nothing in runtime. Cold agents may lose a TCO summary unless the content is preserved in the product home or history. |
| **Action owner** | `api-cost-savings` product-owner / Founder. |

---

### B. Legitimate canonical sources with limited scope (false positives in first-pass audit)

| File | `data/constitutional-framework/RESEARCH_REGISTRY.json` |
|---|---|
| **Exact claim** | `"authority": {"domain": "Research", "status": "CANONICAL", "note": "Candidates and provisional theories — not governing authority until promoted..."}` |
| **Claimed scope** | Research registry **container** for candidate principles and provisional theories. |
| **Granting source** | `NORTH_STAR_SSOT.md` §2.0M explicitly ratifies it: "the research registry for candidates and provisional theories is `data/constitutional-framework/RESEARCH_REGISTRY.json`"; `CONSTITUTIONAL_FRAMEWORK_v1.md` line 225 repeats this. |
| **Active consumers** | `scripts/constitutional-framework.mjs`, `scripts/verify-constitutional-architecture-acceptance.mjs`. |
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
| **Active consumers** | `services/governed-autonomous-shipping-loop.js` orders products by this file; `docs/products/builderos/PRODUCT_HOME.md` references it. |
| **Runtime reachability** | Runtime autonomous shipping loop uses it. |
| **Conflict** | `AUTHORITY_BOUNDARIES.md` active product truth layers do not list `PRODUCT_BUILD_PRIORITY.json`, yet it is a real operational canonical source. It is subordinate to `BP_PRIORITY.json` (machine queue) and `PRODUCT_REGISTRY.json` (product homes). |
| **Correct disposition** | **Relabel / document**, not delete. Add `docs/products/PRODUCT_BUILD_PRIORITY.json` to `AUTHORITY_BOUNDARIES.md` as `Founder business priority (operational canonical, subordinate to BP_PRIORITY.json)`. Clarify relationship to `BP_PRIORITY.json` in the file. |
| **What breaks if authority removed** | Autonomous shipping loop loses founder financial ordering; likely falls back to maturity-based ordering. |
| **Action owner** | mechanical / Founder. |

---

### C. Registry / owner conflicts

| File | `docs/products/lip/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Metadata table: `**Product id** | \`lip\``; `**Canonical home** | this file`; `**Constitutional law** | docs/constitution/NORTH_STAR_SSOT.md`; `**Machine manifest** | docs/products/lip/FILE_MANIFEST.json`. |
| **Claimed scope** | Canonical product home for Limitless Investment Protocol. |
| **Granting source** | `docs/products/CANONICAL_PRODUCT_HOME_RULES.md` requires each product to be listed in `PRODUCT_REGISTRY.json`. `PRODUCT_REGISTRY.json` does **not** contain a `lip` entry. `limitlessos` is registered. |
| **Active consumers** | `docs/products/lip/FILE_MANIFEST.json` exists. `package.json` appears to contain `lip:*` scripts (grep suggests `"lip:` token present; full list not verified in this scan). |
| **Runtime reachability** | **THINK:** Scripts under `lip` product may be reachable via `npm run lip:*` if present. Not checked against runtime API routes in this scan. |
| **Conflict** | Product home and manifest exist but product is unregistered. Either the registry is stale or the product home was created outside the canonical registration path. |
| **Correct disposition** | **Founder/business decision:** (a) register `lip` as a standalone product in `PRODUCT_REGISTRY.json` with `limitlessos` as related parent or business unit; or (b) fold `lip` into `docs/products/limitlessos/PRODUCT_HOME.md` and move `docs/products/lip/` to `docs/products/limitlessos/lip/` or `docs/history/`. |
| **What breaks if authority removed** | If `lip` runtime scripts are active, folding without updating `package.json` / `FILE_MANIFEST.json` references would break them. |
| **Action owner** | Founder. |

---

### D. Historical contamination / stale references in canonical product homes

These product homes are themselves registered in `PRODUCT_REGISTRY.json` and are legitimate canonical product homes, **but they still point to forbidden legacy overlay files as if they were active surfaces**. This is a contamination finding, not an impostor-authority finding.

| File | `docs/products/command-center/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Lines 81-82: `public/overlay/command-center.html ← operational admin dashboard (do not replace)`; `public/overlay/lifeos-command-center.html ← NEW: executive oversight cockpit (v2)`. Additional `lifeos-voice-rail-v1.html` references appear in change receipts. |
| **Claimed scope** | Active UI surfaces for command-center features. |
| **Granting source** | `.cursor/rules/legacy-interfaces-forbidden.mdc` declares `command-center.html`, `lifeos-command-center.html`, and `lifeos-voice-rail-v1.html` forbidden and dead; the only active founder interface is `public/overlay/lifeos-app.html`. Change receipts in the same file confirm `routes/public-routes.js` redirects those paths to `/lifeos?direct_system=1`. |
| **Active consumers** | Product home is a cold-agent read. `routes/public-routes.js` redirects the legacy paths at runtime, so the legacy files are not served as active entrypoints. |
| **Runtime reachability** | Legacy files are not reachable as primary surfaces; routes redirect them. |
| **Conflict** | Canonical product home describes forbidden legacy overlays as operational / new surfaces. A cold agent building from this home could recreate dead files. |
| **Correct disposition** | Replace active references with `public/overlay/lifeos-app.html` and the relevant API routes. Move historical redirect/retirement notes into a `HISTORY_ONLY` section or `docs/history/legacy-overlays/` with explicit redirection receipts. |
| **What breaks if authority removed** | Nothing in runtime. Cold-agent guidance improves. |
| **Action owner** | `command-center` / `lifeos` product-owner / Builder. |

| File | `docs/products/lifeos/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Line 990: `public/overlay/lifeos-backtest.html renders the results with a permanent red EDUCATION ONLY... banner`. Additional `lifeos-voice-rail-v1.html` references in change receipts about redirects. |
| **Claimed scope** | Active UI surface for backtest visualization. |
| **Granting source** | `.cursor/rules/legacy-interfaces-forbidden.mdc` declares `lifeos-backtest.html` experimental and never shipped; `public/overlay/lifeos-app.html` is the only active founder interface. The backtest data is exposed via `routes/lifeos-backtest-routes.js` `/api/v1/lifeos/backtest/*` (read-only API). |
| **Active consumers** | Product home; `routes/lifeos-backtest-routes.js` API. |
| **Runtime reachability** | `lifeos-backtest.html` is forbidden; the API is mounted. |
| **Conflict** | Product home describes a forbidden HTML overlay as the rendering surface for a live API. |
| **Correct disposition** | Replace `public/overlay/lifeos-backtest.html` reference with the API endpoints and `lifeos-app.html` integration (if any). For `lifeos-voice-rail-v1.html`, ensure references are only in redirect/archive context; if active, replace with `/lifeos` and `lifeos-app.html`. |
| **What breaks if authority removed** | Nothing in runtime. API remains reachable. |
| **Action owner** | `lifeos` product-owner / Builder. |

| File | `docs/products/project-governance/PRODUCT_HOME.md` |
|---|---|
| **Exact claim** | Line 186 active task list: `Wire estimation accuracy, readiness queue, and governance drill-down into the Command Center overlay` → `#project-governance-panel` in `lifeos-command-center.html` Section F. Line 297 change receipt repeats the same. |
| **Claimed scope** | Active UI surface for project-governance drill-down. |
| **Granting source** | `.cursor/rules/legacy-interfaces-forbidden.mdc` declares `lifeos-command-center.html` forbidden and replaced; change receipt (line 24) states legacy overlays were archived and redirect to `/lifeos?direct_system=1`. |
| **Active consumers** | Product home; `routes/project-governance-routes.js` API. |
| **Runtime reachability** | `lifeos-command-center.html` is forbidden. |
| **Conflict** | Active product backlog instructs building into a retired overlay. |
| **Correct disposition** | Replace `lifeos-command-center.html` with `public/overlay/lifeos-app.html` or the project-governance API endpoints. Update or archive the stale task. |
| **What breaks if authority removed** | Nothing in runtime. |
| **Action owner** | `project-governance` / `lifeos` product-owner / Builder. |

---

### E. Filename-only review candidates (warnings, not proven authority violations)

These files contain `SSOT` or `single source of truth` in their names. Filename alone is insufficient to prove active authority. Most are already historical, mission-local, or proposed.

| Location / pattern | Count | Likely nature | Recommended action |
|---|---|---|---|
| `builderos-reboot/PSSOT_VOCABULARY.md` | 1 | Mission-local / proposed vocabulary | Inspect header; if no active consumer, rename to remove `SSOT` or move to `docs/history/`. |
| `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT*.md` | 4 | Mission artifacts | Review for unique ideas → move to `docs/history/` or mission `CONTENT/` with `PROPOSED` banner. |
| `docs/COMPLETION_VOCABULARY_SSOT.md` | 1 | Root-level doc | Check active consumers. Likely historical; move to `docs/history/` or rename. |
| `docs/LIFEOS_CONVERSATION_EVIDENCE_SSOT.md` | 1 | Conversation evidence | Move to `docs/conversation_dumps/` or `docs/history/` if not active. |
| `docs/LIFEOS_PROGRAM_MAP_SSOT.md` | 1 | Program map | If current, integrate into `lifeos` product home; if stale, archive. |
| `docs/SSOT_AMENDMENT_BUILD_READINESS_AUDIT.md` | 1 | Audit artifact | Treat as point-in-time gap audit per `AUTHORITY_BOUNDARIES.md` → move to `docs/history/` or `docs/constitution/proposals/`. |
| `prompts/00-SSOT-READ-SEQUENCE.md` | 1 | Agent read-order prompt | Rename to remove `SSOT` (it is a read sequence, not a source of truth) or clarify as `read-order-prompt`. |
| `docs/conversation_dumps/by-product/sessions/*/GOVERNANCE-SSOT.md` | ~10 | Conversation dumps | Already in `conversation_dumps/` (historical). Rename to remove `SSOT` if they ever leave the dump folder. |
| `docs/history/constitution/SSOT_NORTH_STAR_path_archived_2026-06-29.md` | 1 | Archived file with explicit `archived` in name | Keep as-is in history; filename retention is acceptable because it is clearly historical. |

**Excluded from warnings (legitimate scoped SSOT references):**
- `docs/SSOT_COMPANION.md` and `docs/SSOT_DUAL_CHANNEL.md` — explicitly referenced by `NORTH_STAR_SSOT.md` read chain and hierarchy as operational companion documents.

---

### F. Confirmed duplicate active authorities

No two files were found claiming **exactly identical constitutional or product scope** as active authority. One near-duplicate relationship requires documentation:

- `builderos-reboot/BP_PRIORITY.json` (machine queue) and `docs/products/PRODUCT_BUILD_PRIORITY.json` (founder financial priority) both order products. They are **not** duplicates — one is the active execution queue, the other is the founder's business priority input — but the relationship must be explicit to avoid cold agents confusing them. Recommendation: add a cross-reference note in both files.

---

## 3. Summary counts

| Category | Unique files | Disposition recommendation |
|---|---|---|
| A. Unearned constitutional/SSOT claim | 1 (`docs/TCO_ANNEX.md`) | Integrate + archive / move to history |
| B. Legitimate scoped canonical (false positive) | 3 (`RESEARCH_REGISTRY.json`, `LENS_REGISTRY.json`, `PRODUCT_BUILD_PRIORITY.json`) | Relabel / document scope; keep |
| C. Registry/owner conflict | 1 (`docs/products/lip/PRODUCT_HOME.md`) | Register or fold into `limitlessos` — Founder decision |
| D. Historical contamination in product homes | 3 (`command-center`, `lifeos`, `project-governance` `PRODUCT_HOME.md`) | Replace forbidden legacy references with `lifeos-app.html`/API; move history notes |
| E. Filename-only SSOT candidates | ~20 | Review; mostly historical/mission-local; likely archive/rename |
| F. Confirmed duplicate active authorities | 0 | Document `BP_PRIORITY` ↔ `PRODUCT_BUILD_PRIORITY` relationship |

**No files were moved, renamed, or deleted for this report.**
