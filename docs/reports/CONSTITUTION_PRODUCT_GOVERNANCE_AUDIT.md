<!-- SYNOPSIS: Governance audit — constitution, SSOT, and product-home architecture — THINK-grade recommendation -->

# Constitution, SSOT, and Product-Governance Audit

**Classification:** THINK-grade analysis and recommendation.  
**Scope:** `docs/constitution/`, `docs/SSOT_COMPANION.md`, agent/prompt rules, `docs/products/*`, `builderos-reboot/MISSIONS/`, and live verifiers.  
**Verdict:** The hierarchy is mostly right; the bloat and drift are in the *plumbing*, not the *principles*. The biggest risk is that every product home has become a mini-constitution, the constitution still points at deleted amendment files, and the enforcement scripts pass while real drift is still present.

---

## 1. TL;DR

Keep the three-tier hierarchy you already have — **Constitution > Companion > Product Home** — but make each layer *do only one job* and enforce that separation mechanically. Move product-specific governance out of the constitution and out of the product-home bloat into a standard `GOVERNANCE.md` per product. Archive or relocate the mission-amendment files that are currently sitting in `docs/constitution/`. Make the preflight fail on the governance gaps it currently ignores.

---

## 2. Evidence (KNOW)

| Signal | Value | Source |
|---|---|---|
| Product-home line count | 18,943 lines across 47 `PRODUCT_HOME.md` files | `wc -l docs/products/*/PRODUCT_HOME.md` |
| Largest product homes | `lifeos` 2,341; `marketingos` 1,440; `builderos` 1,174; `tc-service` 1,160 | same |
| Constitutional term repetition in product homes | 805 matches for `Constitution`, `constitutional`, `Amendment`, `North Star`, `SSOT`, `§2.` | `grep` across `docs/products/**/PRODUCT_HOME.md` |
| `@ssot` tag coverage | 906 tagged, 525 missing | `node scripts/ssot-check.js --all` |
| `verify-product-home` scope | Only enforces `lifeos` and `lifere`; 45 products are not checked | `scripts/verify-product-home.mjs` lines 29-49 |
| Migration-debt files flagged | 3 files missing `@ssot` in `lifeos` manifest | `npm run lifeos:product-home:verify` |
| `builder:preflight` | PASS (460/460) despite missing `@ssot` tags and product-home bloat | `npm run builder:preflight` |
| `lifeos:bp-priority:verify` | PASS | `npm run lifeos:bp-priority:verify` |
| Broken authority references | `NORTH_STAR_SSOT.md` §2.11 still references `docs/projects/AMENDMENT_*.md` (deleted); `builderos-reboot/AGENTS.md` references missing `docs/constitution/AMENDMENT_PACK_V2.0A.md` | `grep` / `find_file_by_name` |
| Constitution-folder bloat | `AMENDMENT_BUILDEROS_CONVERGENCE.md` and `AMENDMENT_COGNITIVE_LAYERS.md` are mission amendments, not constitutional law | `docs/constitution/` listing |

---

## 3. What to keep — and why

### 3.1 The three-tier hierarchy

Keep the stack you have:

1. **`docs/constitution/NORTH_STAR_SSOT.md`** — supreme law.
2. **`docs/SSOT_COMPANION.md`** — operational manual.
3. **`docs/products/<product>/PRODUCT_HOME.md` + `FILE_MANIFEST.json`** — product truth and ownership map.
4. **`builderos-reboot/BP_PRIORITY.json` + `MISSIONS/<id>/` + `OBJECTIVE_VERDICT.json`** — machine queue and mission proofs.

This is the right separation of concerns. It matches `docs/AGENT_RULES.compact.md` line 8 (`NSSOT > Companion > CLAUDE.md > product homes > repo`) and `docs/products/AUTHORITY_BOUNDARIES.md`.

### 3.2 The constitution files that are actually constitutional

- **`NORTH_STAR_SSOT.md`** — keep as the one live law file.
- **`POINT_B_DNA.md`**, **`LUMIN_COMMUNICATION_DNA.md`**, **`LUMIN_DISPLAY_DNA.md`** — keep as subordinate supplements; they are identity/UX doctrine, not operational procedure.
- **`COGNITIVE_CORE_LAWS.md`** — keep if it is genuinely universal; if it is only for the cognitive core product, move it to that product's `GOVERNANCE.md` and list it as a supplement in `README.md`.
- **`UNIFIED_DOCTRINE_MAP.md`** — keep as a derivation map, but ensure it stays subordinate and does not accumulate new authority.

### 3.3 Product-home scaffolding

Keep the per-product structure:

- Canonical header table (product id, status, lifecycle, reversibility, verification command, constitutional law link).
- Mission / Scope / Non-scope.
- Owned files and shared dependencies pointers.
- Active missions and `BUILD_QUEUE.json` link.
- Change Receipts (but as a single append-only table, not multiple tables or prose paragraphs).

This is already defined in `docs/products/CANONICAL_PRODUCT_HOME_RULES.md` and it is correct.

### 3.4 Agent entry files

Keep `docs/AGENT_RULES.compact.md` and the per-path `AGENTS.md` files (`builderos-reboot/AGENTS.md`, `factory-staging/AGENTS.md`, `routes/AGENTS.md`, etc.). They are read-order pointers, which is exactly what cold agents need. They should *point* at law, not restate it.

---

## 4. What to merge, archive, or delete — and why

### 4.1 Merge into the constitution or companion, then archive

- **`docs/constitution/AMENDMENT_BUILDEROS_CONVERGENCE.md`** and **`AMENDMENT_COGNITIVE_LAYERS.md`** — These are mission-level ratifications, not constitutional law. If their contents are now universal (e.g. the five-layer stack, blueprint-authority doctrine), merge them into `NORTH_STAR_SSOT.md` or `SSOT_COMPANION.md` under the appropriate section and archive the standalone files to `docs/history/constitution/`. If they are mission-specific, move them into `builderos-reboot/MISSIONS/FACTORY-BUILDEROS-CONVERGENCE-0001/` or `FACTORY-COGNITIVE-ARCHITECTURE-0001/`.
- **`docs/constitution/FOUNDER_PACKET_V2_BUILDEROS_MASTER_ARCHITECTURE.md`** and **`FOUNDER_PACKET_V3_...`** — Archive to `docs/history/founder-packets/`. Link from `docs/products/builderos/PRODUCT_HOME.md` if still relevant, but do not keep vision packets in the constitution folder.
- **`docs/constitution/CONSTITUTION_INVENTORY.md`, `CONSTITUTION_MAPPING.md`, `CONSTITUTION_CONFLICTS.md`, `NORTH_STAR.md`** — Keep as one-line redirects if external links exist. If nothing links to them, merge their single line into `docs/constitution/README.md` and delete the stubs. The `README.md` already lists the redirect status of each.

### 4.2 Diet the product homes

- **Multi-paragraph `Last Updated` blocks** — These have become append-only walls of prose. Keep the current row in a single `## Change Receipts` table and move all older rows to `docs/products/<product>/CHANGELOG.md` or `docs/history/products/<product>/`. Example: `docs/products/lifeos/PRODUCT_HOME.md` is 2,341 lines; most of that is old receipts.
- **Multiple competing `## Change Receipts` tables** — Some product homes have more than one table with different column schemas (`builderos/PRODUCT_HOME.md` explicitly admits this). Consolidate into one table and archive the rest.
- **`## AGENT CONTINUITY NOTICE` blocks that restate `CLAUDE.md`** — Replace with a one-line pointer: "Read `docs/AGENT_RULES.compact.md`, `prompts/00-LIFEOS-AGENT-CONTRACT.md`, and the last 3 rows of this file before editing." The `lifeos` product home still tells agents to read `AMENDMENT_21_LIFEOS_CORE.md`, which no longer exists.
- **Restatements of North Star clauses** — Remove paragraphs that quote §2.6, §2.11, §2.12, etc. One line per clause is enough: "This product is bound by North Star §2.6 (no misleading), §2.10 (observe/grade/fix), §2.11 (system builds product), §2.12 (council for load-bearing forks)."
- **"Formerly called: Amendment XX" followed by long legacy notes** — Keep the one-line lineage note. Move the rest to `docs/products/<product>/HISTORY.md`.

### 4.3 Delete or fix broken references

- In `NORTH_STAR_SSOT.md` §2.11, replace `docs/projects/AMENDMENT_*.md` with `docs/products/<product>/PRODUCT_HOME.md` / `builderos-reboot/MISSIONS/<id>/BLUEPRINT.json`.
- In `builderos-reboot/AGENTS.md`, remove or retarget the reference to `docs/constitution/AMENDMENT_PACK_V2.0A.md` (file does not exist).
- In any product home that still mentions dead `AMENDMENT_NN` paths (e.g. `docs/products/lifeos/PRODUCT_HOME.md` lines 116-147), replace with the canonical product home path.
- The `docs/projects/` directory appears to be gone from the live tree (only `_hist` snapshots remain). Confirm no live file references it, then update any remaining prompts or comments.

### 4.4 Split or trim `SSOT_COMPANION.md`

`SSOT_COMPANION.md` is 887 lines and overlaps heavily with `NORTH_STAR_SSOT.md`. Options:

- **Option A (recommended):** Keep it as the *operational* companion only: read order, conflict rules, agent contract summary, truth-ladder promotion, council protocol, fail-closed conditions, high-risk definitions. Move the deep product-domain sections (TCO, MICRO protocol, Builder Pod / Money Pod weekly minimums, overlay visibility) into their owning product homes or a new `docs/operations/` folder.
- **Option B:** If you want one giant manual, enforce a hard cap (e.g. 600 lines) and a duplication linter that fails preflight if a section restates a North Star clause without adding operational detail.

### 4.5 Move platform-wide agent architecture out of a product home

`docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md` contains a "Formal Agent Architecture — 6-Role Model" that is platform-wide. If it is meant to be universal, promote it to `SSOT_COMPANION.md` §0.5 or a new `docs/operations/AGENT_ROLES.md`. If it is only for the zero-drift protocol, keep it but rename/reframe it as product-specific.

---

## 5. Proposed sane, enforceable structure

```
docs/constitution/
  README.md                         # index + amendment process
  NORTH_STAR_SSOT.md                # supreme law
  POINT_B_DNA.md                    # purpose supplement
  LUMIN_COMMUNICATION_DNA.md        # voice/UX doctrine
  LUMIN_DISPLAY_DNA.md              # UI/worklog doctrine
  COGNITIVE_CORE_LAWS.md            # either universal supplement or product GOVERNANCE
  proposals/                        # pending amendments
    YYYY-MM-DD-title.md

docs/operations/                    # (new) operational manual, split from SSOT_COMPANION
  SSOT_COMPANION.md                 # trimmed to read order, conflict, truth ladder, council, fail-closed
  AGENT_ROLES.md                    # 6-role model if ratified platform-wide
  AGENT_RULES.compact.md            # keep
  README.md                         # index

docs/products/<product>/
  PRODUCT_HOME.md                   # human-facing truth; max 500 lines
  GOVERNANCE.md                     # (optional) product-specific governance
  FILE_MANIFEST.json                # machine ownership map
  CHANGELOG.md                      # append-only change receipts (older rows moved here)
  HISTORY.md                        # amendment lineage + legacy notes
  BUILD_QUEUE.json                  # active build steps
  OBJECTIVE_VERDICT.json            # acceptance results

builderos-reboot/
  BP_PRIORITY.json                  # canonical scheduler queue
  MISSIONS/                         # active mission packs
    _archive/                       # completed missions
  DECISIONS/                        # decision records

scripts/governance/                 # (new or extend)
  verify-product-home.mjs           # enforce all 47 products, not just lifeos/lifere
  governance-drift-audit.mjs        # dead links, duplication, bloat, missing @ssot
  amendment-propose.mjs             # create proposal, run council, record vote
  amendment-ratify.mjs              # update NORTH_STAR_SSOT.md after 7-day + Human Guardian
```

### 5.1 Product-home standard template

Every `PRODUCT_HOME.md` should start with this exact header block and no more:

```markdown
| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `<id>` |
| **Parent product** | `<parent or none>` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Product governance** | `docs/products/<id>/GOVERNANCE.md` (if product-specific rules exist) |
| **File manifest** | `docs/products/<id>/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Status** | `ACTIVE` | `EXPERIMENTAL` | `DEPRECATED` | `SCRAPPED_SALVAGE` |
| **Lifecycle** | `production` | `beta` | `alpha` | `experimental` |
| **Reversibility** | `two-way-door` | `one-way-door` | `irreversible` |
| **Risk tier** | `low` | `medium` | `high` | `critical` |
| **Verification command** | `npm run <product>:verify` or `node scripts/verify-<product>.mjs` |
| **Last Updated** | `YYYY-MM-DD` — one-sentence summary |

## Mission
One paragraph.

## Scope / Non-scope
...

## Owned files / Shared dependencies
Pointer to `FILE_MANIFEST.json`.

## Active missions
...

## Product-specific governance
If this product has rules beyond the constitution, they live in `GOVERNANCE.md`. This section is a pointer, not a copy.

## Change Log
Single append-only table. After 50 rows, archive oldest to `CHANGELOG.md`.

## Agent Handoff Notes
Current state + next priority.
```

### 5.2 Product `GOVERNANCE.md` template

Use this for product-specific governance only. It must be subordinate to North Star:

```markdown
# <Product> Governance

**Subordinate to:** `docs/constitution/NORTH_STAR_SSOT.md`
**Scope:** rules specific to this product that are stricter than, but do not contradict, the constitution.

## Constitutional invariants
List the North Star clauses that are load-bearing for this product (e.g. §2.6, §2.10, §2.11, §2.12, §2.15).

## Product-specific policies
- Policy 1 (why, enforcement, review cadence)
- Policy 2

## Authority class and change process
- Risk tier: ...
- Reversibility: ...
- Who may change this file: ...
- Council vote required when: ...
- Human Guardian approval required when: ...

## Decision log
Link to `builderos-reboot/DECISIONS/` or `docs/products/<product>/CHANGELOG.md`.
```

---

## 6. Enforcement plan

The current verifiers pass while real drift exists. Change the tooling so the *mechanics* match the *principles*.

1. **Extend `scripts/verify-product-home.mjs` to all products.** Currently it only checks `lifeos` and `lifere` (lines 29-49). It should load `PRODUCT_REGISTRY.json` and enforce every product that has a `FILE_MANIFEST.json`.
2. **Add `scripts/governance-drift-audit.mjs` and wire it into `builder:preflight`.** It should fail if:
   - A `PRODUCT_HOME.md` exceeds a line cap (e.g. 500 lines) without an archived `CHANGELOG.md`.
   - A source file's `@ssot` tag points to a missing or non-canonical product home.
   - A markdown file contains a link to a non-existent file (`docs/projects/AMENDMENT_*.md`, `AMENDMENT_PACK_V2.0A.md`, etc.).
   - A product home restates North Star clauses beyond a short pointer list (keyword-density or citation check).
   - A product home has multiple `## Change Receipts` tables or non-table `Last Updated` prose blocks.
3. **Make `scripts/ssot-check.js --all` fail-closed or move it to a separate `governance:warn` script.** Right now `builder:preflight` passes with 525 missing `@ssot` tags. Either those files must be tagged or the check must be scoped to protected source files only, not all 1,431 source files.
4. **Add header-schema validation for `PRODUCT_HOME.md` and `FILE_MANIFEST.json`.** Require the header fields above. `PRODUCT_REGISTRY.json` should also be schema-checked for the same fields.
5. **Amendment workflow in code.** `NORTH_STAR_SSOT.md` Article VII is four bullets. Add:
   - `docs/constitution/proposals/` directory.
   - `PROPOSED_AMENDMENT_TEMPLATE.md`.
   - `scripts/amendment-propose.mjs` creates a proposal, records AI council votes, and starts a 7-day review timer.
   - `scripts/amendment-ratify.mjs` appends the change to `NORTH_STAR_SSOT.md` only after unanimous AI vote + Human Guardian written approval + 7 days.
   - `builder:preflight` rejects any direct edit to `NORTH_STAR_SSOT.md` that does not come with a matching `proposals/` ratification file.
6. **Governance-change process for product homes.** Any change to a `GOVERNANCE.md` that asserts authority over shared files or contradicts another product's governance must go through `POST /api/v1/lifeos/gate-change` (existing) and be recorded in `builderos-reboot/DECISIONS/`.

---

## 7. Recommended migration order

Phase 0 (now, no risk):
1. Fix the broken references in `NORTH_STAR_SSOT.md` and `builderos-reboot/AGENTS.md`.
2. Run `grep -R "docs/projects/AMENDMENT_"` on live code and retarget or remove matches.
3. Add the three missing `@ssot` tags surfaced by `lifeos:product-home:verify`.

Phase 1 (product-home diet, low risk):
4. Pick the 5 largest product homes (`lifeos`, `marketingos`, `builderos`, `tc-service`, `clientcare-billing-recovery`) and move pre-2026 change receipts to `CHANGELOG.md`.
5. Consolidate multiple `## Change Receipts` tables in each.
6. Replace `AGENT CONTINUITY NOTICE` blocks with a pointer to agent rules.
7. Replace North Star clause restatements with short pointer lists.

Phase 2 (authority relocation, medium risk):
8. Relocate `AMENDMENT_BUILDEROS_CONVERGENCE.md` and `AMENDMENT_COGNITIVE_LAYERS.md` to mission packs or archive after promoting universal contents.
9. Archive `FOUNDER_PACKET_V2/V3` files.
10. Decide whether `COGNITIVE_CORE_LAWS.md` is universal or product-specific and relocate/list accordingly.
11. Move platform-wide agent architecture from `zero-drift-handoff-protocol/PRODUCT_HOME.md` to `docs/operations/AGENT_ROLES.md`.

Phase 3 (enforcement, medium-high risk):
12. Extend `verify-product-home.mjs` to all products.
13. Build `governance-drift-audit.mjs` and wire into `builder:preflight`.
14. Decide the scope of `ssot-check.js` (all files or protected only) and make it fail-closed or scoped.
15. Add product-home header schema and registry schema checks.

Phase 4 (amendment workflow, high ceremony):
16. Implement `docs/constitution/proposals/` + scripts + preflight guard for `NORTH_STAR_SSOT.md` edits.
17. Ratify the structural changes themselves through that workflow (meta-governance).

---

## 8. Open questions for you

1. Do you want `COGNITIVE_CORE_LAWS.md` to remain a universal constitutional supplement, or is it the governance of a specific product (e.g. `memory-intelligence`, `ai-council`, or `lifeos`)?
2. Should every product have a `GOVERNANCE.md`, or only products with non-obvious product-specific rules beyond the constitution?
3. Do you want the `ssot-check` preflight to be fail-closed for *all* `.js` files, or only for protected files (`routes/`, `services/`, `factory-core/`, etc.)?
4. Should the product-home line cap be enforced (e.g. 500 lines), or do you prefer a softer warning?
5. For the `AMENDMENT_BUILDEROS_CONVERGENCE.md` and `AMENDMENT_COGNITIVE_LAYERS.md` files: promote to constitution/operations, move to mission packs, or archive?

---

## 9. Bottom line

The system is not broken at the principle level. It is broken at the *bookkeeping* level: the constitution points at deleted files, the product homes quote the constitution instead of referencing it, and the verifiers pass while hundreds of files lack ownership tags. The fix is not more laws; it is stricter separation between "what is true for the whole platform" and "what is true for one product," plus a linter that enforces that separation in every commit.
