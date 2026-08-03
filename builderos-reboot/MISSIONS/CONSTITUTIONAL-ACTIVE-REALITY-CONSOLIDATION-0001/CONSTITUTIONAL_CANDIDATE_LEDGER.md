<!-- SYNOPSIS: Candidate principles and ideas found outside the active Constitution that may deserve promotion, extracted non-destructively. -->

# CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001 — Constitutional Candidate Ledger

**Mission:** `CONSTITUTIONAL-ACTIVE-REALITY-CONSOLIDATION-0001`  
**Date:** 2026-08-04  
**Source authority:** `NORTH_STAR_SSOT.md` §2.0M / Truth Ladder — candidates and provisional theories live in the research registry and are not themselves authority levels. This ledger is the human-reviewable staging area for promotion decisions.

---

## Candidate 1 — Implementation Engine / Idea Lifecycle

| Field | Value |
|---|---|
| **Direct quotation** | "What is architecturally approved but not yet real?" — "Every architectural idea should have exactly one state: DISCOVERED → APPROVED → BLUEPRINTED → IMPLEMENTING → WIRED → VERIFIED → INDEPENDENTLY VERIFIED → OBSERVED IN PRODUCTION → MATURE." |
| **Source file** | User attachment `pasted-1785777708248.md` (founder-relayed Phase 8 critique) and `docs/BLUEPRINT_COMMUNICATION_FIRST_2026-08-02.md` Phase 8.2/8.3/8.4. |
| **Context** | The architecture has converged; remaining work is installation, enforcement, calibration, and measurement. The system needs a machine that continuously asks what is approved-but-not-real and reports institutional maturity rather than commits. |
| **Argument for** | Prevents "kind of implemented" ambiguity; gives the founder a single lifecycle view; enables the Architectural Throughput KPI; turns founder insight into permanent capability without shepherding every step. |
| **Argument against** | Existing signals (`BUILD_QUEUE.json` status/`heal_reason`/`artifact_proven`/`grounding_status`, `ENFORCEMENT_MATRIX.json`, `BP_PRIORITY.json`, `PRODUCT_REGISTRY.json`, `FILE_MANIFEST.json`) are scattered and inconsistent. Building an 8th tracking system before composing existing signals risks the same mistake as the Confidence Ledger proposal. |
| **Present evidence** | `BUILD_QUEUE.json` files carry per-step statuses; `ENFORCEMENT_MATRIX.json` maps constitutional laws to verifiers; `BP_PRIORITY.json` and `PRODUCT_BUILD_PRIORITY.json` order work; `PRINCIPLE_RUNTIME_MAP.json` maps principles to runtime artifacts. They are not composed into one view. |
| **Truth Ladder level** | `Hypothesis` — founder directive + clear gap, but the concrete data model and compose path are unproven. |
| **Proposed destination** | `docs/products/builderos/specs/IMPLEMENTATION_ENGINE.md` as operational spec; later `data/constitutional-framework/CANDIDATE_LIFECYCLE_REGISTRY.json` or `data/implementation-engine/IDEA_LIFECYCLE_REGISTRY.json`. |
| **Consequences of acceptance** | The system can answer "where is this idea in its lifecycle?" instantly and produce the proposed maturity dashboard. Requires wiring to existing signals, not inventing new ones. |
| **Consequences of rejection** | Continued ambiguity; "approved but not real" drift remains undetected; founder continues to be the project manager for every step. |
| **Proof required before promotion** | A read-only script that scans existing signals and produces the DISCOVERED→MATURE table for at least three real ideas (e.g., user-auth v1, institutional constellation, second-factor SMS) with receipts that match runtime reality. |

---

## Candidate 2 — Authority-Dimension Vocabulary

| Field | Value |
|---|---|
| **Direct quotation** | "You need multiple authority dimensions: constitutionally supreme; canonical governance source; canonical operational source; canonical product source; canonical generated artifact; historical only. The current binary scheme is too crude." |
| **Source file** | User attachment `pasted-1785777708248.md` (founder/ChatGPT audit critique). |
| **Context** | The first-pass audit flagged `RESEARCH_REGISTRY.json`, `LENS_REGISTRY.json`, and `PRODUCT_BUILD_PRIORITY.json` as "not in allowed canonical namespace" because it only understood binary `CANONICAL`/`not CANONICAL`. |
| **Argument for** | Prevents the audit script from inventing its own path allowlist; allows scoped canonical sources to exist without being treated as constitutional impostors; matches the real architecture where `BP_PRIORITY` and `PRODUCT_BUILD_PRIORITY` have different but legitimate scopes. |
| **Argument against** | Adds vocabulary; must be taught to every cold agent and verifier; risk of over-engineering if kept as prose. |
| **Present evidence** | `AUTHORITY_BOUNDARIES.md` already distinguishes active product truth vs. law/history anchors, but it does not list authority dimensions explicitly. `NORTH_STAR_SSOT.md` §2.0A distinguishes foundational law / operating law / implementation policy. |
| **Truth Ladder level** | `Emerging Pattern` — the distinction is already used in practice but not codified. |
| **Proposed destination** | `docs/products/AUTHORITY_BOUNDARIES.md` new section "Authority dimensions (scoped, not binary)" and `data/constitutional-framework/REGISTRY.json` `authority_level` field alignment. |
| **Consequences of acceptance** | Future authority scans can classify by dimension, not just path; fewer false positives; clearer promotion/demotion rules. |
| **Consequences of rejection** | Continued risk of scoped operational sources being misclassified as unearned constitutional claims or vice versa. |
| **Proof required before promotion** | Update `AUTHORITY_BOUNDARIES.md` with the dimension table; re-run the authority scan; show that `RESEARCH_REGISTRY.json`, `LENS_REGISTRY.json`, and `PRODUCT_BUILD_PRIORITY.json` are correctly classified and no new false positives appear. |

---

## Candidate 3 — Constitutional Candidate Ledger Process

| Field | Value |
|---|---|
| **Direct quotation** | "If the file contains a genuinely valuable principle that is missing from the Constitution: do not silently promote it; extract the exact principle; record its source and original wording; add it to the Constitutional Candidate Ledger; classify its current Truth Ladder level; identify supporting and contradictory evidence; specify its proposed destination; identify what must be proven before promotion; bring it to you and the proper Council process." |
| **Source file** | User attachment `pasted-1785777708248.md`. |
| **Context** | The founder wants exactly one active constitutional reality and wants good ideas flagged for review rather than silently promoted or lost in archive. |
| **Argument for** | Prevents good ideas from being buried during cleanup; prevents unvetted ideas from becoming law because they were in a file named `SSOT`; satisfies `NORTH_STAR_SSOT.md` §2.0B Truth Ladder. |
| **Argument against** | Adds process overhead; could become a dumping ground if not reviewed. |
| **Present evidence** | `data/constitutional-framework/RESEARCH_REGISTRY.json` exists for research candidates, but it is machine-oriented and empty. There is no human-review ledger attached to cleanup missions. |
| **Truth Ladder level** | `Proven Practice` — this report is the first execution; if it works, it can become operating law. |
| **Proposed destination** | `docs/constitution/CONSTITUTIONAL_PROCESSES.md` or `docs/constitution/proposals/CONSTITUTIONAL_CANDIDATE_LEDGER_PROCESS.md`; runtime ledger at `data/constitutional-framework/CANDIDATE_LEDGER.json`. |
| **Consequences of acceptance** | Every future authority cleanup produces a candidate ledger; promotion/demotion follows a visible process. |
| **Consequences of rejection** | Ideas remain in gray zone between prose and law; cleanup may accidentally archive or promote the wrong things. |
| **Proof required before promotion** | This ledger is reviewed by the founder/Chair; at least one candidate from this report is either promoted to the Constitution/SSOT, integrated into a product home, or intentionally rejected with a recorded rationale. |

---

## Candidate 4 — Total Cost Optimizer Mechanisms

| Field | Value |
|---|---|
| **Direct quotation** | "TCO-A01 | STATUS:LIVE | TYPE:SAVINGS | MECHANISM: Session dictionary learning (customer/workspace vocabulary → short codes). FILE: services/token-optimizer.js (PHRASE_TABLE — 15 entries, reversible) METRIC: token reduction % + unchanged quality score." |
| **Source file** | `docs/TCO_ANNEX.md` lines 36-41 and following. |
| **Context** | The TCO annex claims canonical status but is not integrated into the `api-cost-savings` product home. It contains concrete, possibly live token-optimization mechanisms. |
| **Argument for** | If the referenced files (`services/token-optimizer.js`, `services/free-tier-governor.js`, `services/savings-ledger.js`) are live, the mechanisms belong in the product home so cold agents do not recreate them or miss them. |
| **Argument against** | Some items are marked `PLANNED` or `IN_BUILD` in the annex; moving them to the product home could overstate reality. |
| **Present evidence** | `services/token-optimizer.js` exists and is referenced by `server-full-runtime.js`; `public/tco/` landing pages exist; `routes/tco-routes.js` is mounted. |
| **Truth Ladder level** | `Pattern` — code exists, but the annex's exact claims have not been fully verified against runtime. |
| **Proposed destination** | `docs/products/api-cost-savings/PRODUCT_HOME.md` under an "Operating mechanisms" section, with each mechanism labeled `LIVE`/`IN_BUILD`/`PLANNED` and linked to the actual file + verifier. |
| **Consequences of acceptance** | `api-cost-savings` product home becomes the single active owner of TCO truth; the annex can be archived without losing knowledge. |
| **Consequences of rejection** | TCO knowledge stays split between an unauthoritative annex and the product home; cold agents may be confused. |
| **Proof required before promotion** | Verify each `LIVE` mechanism against `services/token-optimizer.js`, `routes/tco-routes.js`, and `public/tco/`; write or update the product home; run `npm run lifeos:product-home:verify`. |

---

## Candidate 5 — Limitless Investment Protocol (`lip`) Product Boundary

| Field | Value |
|---|---|
| **Direct quotation** | "Operator-only capital experiments: multi-account paper → testnet → capped live across crypto, stocks, forex. Not consumer investment advice. Not organizing pumps — pattern detection only." |
| **Source file** | `docs/products/lip/PRODUCT_HOME.md` lines 17-19. |
| **Context** | A well-formed product home exists for `lip` but `lip` is not in `PRODUCT_REGISTRY.json`; `limitlessos` is registered. |
| **Argument for** | `lip` has its own FILE_MANIFEST, runtime scripts, and a distinct scope (operator-only capital experiments). It may deserve its own product entry. |
| **Argument against** | It may be an experiment that belongs under `limitlessos` as a module; creating a product for an unbounded capital experiment may broaden scope prematurely. |
| **Present evidence** | `docs/products/lip/PRODUCT_HOME.md` + `FILE_MANIFEST.json` exist; package.json appears to reference `lip:*` scripts. |
| **Truth Ladder level** | `Hypothesis` — product boundary is not decided. |
| **Proposed destination** | If standalone: `PRODUCT_REGISTRY.json` entry for `lip`. If module: fold into `docs/products/limitlessos/PRODUCT_HOME.md` and move `docs/products/lip/` to `docs/products/limitlessos/lip/` or `docs/history/`. |
| **Consequences of acceptance** | Clear product boundary; `lifeos:product-home:verify` passes; `lip` is routable in the build queue. |
| **Consequences of rejection** | Product home drifts as orphan; build queue may ignore it; confusion about where capital-experiment truth lives. |
| **Proof required before promotion** | Founder decision on product boundary; if standalone, add to `PRODUCT_REGISTRY.json`, update `AUTHORITY_BOUNDARIES.md` if needed, and verify `package.json` scripts still map correctly. |

---

## Ledger status

| Candidate | Truth Ladder | Owner | Next action |
|---|---|---|---|
| 1 — Implementation Engine / Idea Lifecycle | Hypothesis | Founder / Chair | Review; if approved, blueprint the Implementation Engine spec and a read-only signal-composition script. |
| 2 — Authority-Dimension Vocabulary | Emerging Pattern | Chair / Architect | Update `AUTHORITY_BOUNDARIES.md` and re-run authority scan. |
| 3 — Candidate Ledger Process | Proven Practice | Chair | Review this ledger; if approved, codify in `CONSTITUTIONAL_PROCESSES.md`. |
| 4 — Total Cost Optimizer Mechanisms | Pattern | `api-cost-savings` product-owner | Verify live mechanisms and migrate annex content to product home. |
| 5 — `lip` Product Boundary | Hypothesis | Founder | Decide standalone vs. `limitlessos` module. |

**No candidate was promoted to active authority in this report.**
