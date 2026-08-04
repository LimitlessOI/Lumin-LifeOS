<!-- SYNOPSIS: Phase 7 migration / hidden-dependency + archive-decision record (2026-08-03). Audit deliverable. -->

# Hidden Dependency & Migration Audit (Phase 7) — 2026-08-03

## H1 — Framework fork (F-13, P1)
Two files both act as "the Constitutional Framework":
- `docs/constitution/CONSTITUTIONAL_FRAMEWORK.md` — header: **"Status: RATIFIED … Canonical path: docs/constitution/CONSTITUTIONAL_FRAMEWORK.md"**.
- `docs/constitution/CONSTITUTIONAL_FRAMEWORK_v1.md` — header: **"Status: PROPOSED — NOT RATIFIED … Supersedes (when ratified): CONSTITUTIONAL_FRAMEWORK.md (working draft)"**.

They contradict each other about which is authoritative. `FRAMEWORK.md`'s "RATIFIED" rests on `NORTH_STAR_SSOT` §2.0M ("This section ratifies it"), which is itself from the unratified commit `6a5b608fb` (F-01); no ratification record exists.

**Active dependents of `CONSTITUTIONAL_FRAMEWORK.md`:** `NORTH_STAR_SSOT.md` §2.0M, `REGISTRY.json`, `ENFORCEMENT_MATRIX.json`, `README.md`, `CONSTITUTIONAL_PROCESSES.md`, `docs/products/builderos/PRODUCT_HOME.md`, factory mission `FACTORY-CONSTITUTIONAL-ARCHITECTURE-0001`, and scripts `verify-constitutional-architecture-acceptance.mjs`, `verify-constitutional-parity.mjs`, `constitutional-framework.mjs`.

## H2 — Confidence engine duplication (F-09, P2)
`services/confidence-vector.js` (139 lines) and `services/confidence-vectors.js` (132 lines) coexist as near-duplicates — a MOVE-DON'T-RENAME violation. Separately, the only mounted confidence route `/api/v1/confidence-architecture` is a LifeOS child/wellness feature, not the Taloa engine — a misleading name collision.

## H3 — Orphaned engine only just wired (data point, corroborates F-03)
Commit `8b1890fbc` (this session) wired `services/founder-communication-calibration.js`, which its message states "had zero call sites repo-wide despite being cited as done in a 2026-08-02 PRODUCT_HOME.md receipt — same false-done class found repeatedly this session." Independent, in-repo confirmation of the orphaned-engine / false-done pattern. It integrates via `lumin-context-loader.js → formatTwinInjectBlock → buildPromptContext` and is **consistent with** (extends, does not conflict with) `LUMIN_COMMUNICATION_DNA.md`'s "communication profile" layer. The sibling commit `d16032c37` (reflective-questions routing fix in `config/judgment-capsule-contracts.js`) is likewise consistent with the communication stack, not in tension with it.

## H4 — Benign redirect stubs (no action)
`NORTH_STAR.md`, `CONSTITUTION_CONFLICTS.md`, `CONSTITUTION_INVENTORY.md`, `CONSTITUTION_MAPPING.md` are already redirect stubs that explicitly **disclaim** authority ("Not runtime authority", "Do not treat this path as a second supreme authority") and point to `docs/history/` archives. They are correct as-is.

---

## Archive-authorization decision record (founder-authorized narrow carve-out)
Founder authorized `git mv` into `docs/constitution/archive/` for files that are **BOTH** (a) improperly-authoritative **AND** (b) redundant/not-worth-keeping, with no forwarding stubs, letting dependents break loudly. Each candidate was vetted:

| Candidate | (a) Improper authority? | (b) Redundant? | Decision |
|---|---|---|---|
| `CONSTITUTIONAL_FRAMEWORK.md` | YES (RATIFIED w/o record) | **NO** — load-bearing; §2.0M, REGISTRY, ENFORCEMENT_MATRIX, 3 scripts depend on it | **Do not archive** → F-13 authority finding + founder-consideration item |
| `CONSTITUTIONAL_FRAMEWORK_v1.md` | NO (correctly PROPOSED) | Arguable | Do not archive |
| `NORTH_STAR.md` | NO (self-disclaims) | Yes (retired) | Do not archive (already a correct redirect) |
| `CONSTITUTION_CONFLICTS/INVENTORY/MAPPING.md` | NO (self-disclaim) | Yes (retired) | Do not archive (already correct redirects) |

**Location caveat (F-16, P3):** the founder-named archive path `docs/constitution/archive/` is **gitignored** (`.gitignore:25` → `archive/`); moving files there would silently untrack them instead of preserving history. The repo's real, tracked archive convention is `docs/history/constitution/` (the existing redirect stubs point there). The archive-convention index was therefore seeded at `docs/history/constitution/CONSTITUTION_ARCHIVE_INDEX.md`.

**Outcome: no file met both criteria; no `git mv` performed.** Per the founder's own conservatism instruction ("a file that claims authority improperly but contains content not covered elsewhere is a Phase 3 finding, not an archive candidate"), the framework-fork file is handled as F-13. The `docs/constitution/archive/` convention is seeded (`ARCHIVE_INDEX.md`) for future use, and the recommended resolution is recorded in the executive summary's "Recommended for founder consideration" section — the founder should decide whether to revert the unratified §2.0M content or ratify it, which will in turn resolve which framework file survives.

**No hidden dependency was intentionally broken by this audit** (read-only outcome). The dependents listed in H1 are documented so that, when the founder resolves F-01/F-13, the blast radius is known in advance.
