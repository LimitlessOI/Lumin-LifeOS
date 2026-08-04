<!-- SYNOPSIS: Main body of the independent Taloa constitutional-architecture audit (2026-08-03). Audit deliverable, not product code. -->

# Independent Constitutional Architecture Audit — Taloa (2026-08-03)

**Auditor:** Claude Code, independent, hostile-but-fair. **Commit:** `38dba2a0` (origin/main). **Production:** https://lumin-web-production-e3a9.up.railway.app

This is the main body. The one-page conclusion is in `CLAUDE_AUDIT_EXECUTIVE_SUMMARY_2026-08-03.md`; machine-readable findings (F-01…F-15) in `data/audits/constitutional-architecture-audit-2026-08-03.json`.

## Governing standard applied
A principle is **installed** only if it exists as (a) an enforceable governance rule, (b) an actual runtime behavior, or (c) a measurable calibration loop. Files, exports, smoke tests, registry rows, and green existence-checks do **not** count.

## Method
1. Reconstructed intended architecture from the constitutional docs (Phase 1, see `CONSTITUTIONAL_REQUIREMENTS_TRACEABILITY_2026-08-03.md`).
2. Traced runtime reachability of every engine by grep across `routes/ startup/ config/ core/ middleware/ server.js` (Phase 2/5, see `RUNTIME_REACHABILITY_MAP_2026-08-03.md`).
3. Audited constitutional authority + ratification history (Phase 3).
4. Audited enforcement across the local git path AND the GitHub-API machine ship path (Phase 4).
5. Wrote and ran an adversarial `node:test` suite — `tests/audit-taloa-runtime-reachability.test.mjs`, **13 tests, 1 pass / 12 fail** (Phase 9).
6. Probed production read-only (Phase 8, see `DEPLOYMENT_TRUTH_AUDIT_2026-08-03.md`).
7. Traced migration/hidden dependencies + the framework fork (Phase 7, see `HIDDEN_DEPENDENCY_AUDIT_2026-08-03.md`).

## Phase 3 — Authority & ratification (the load-bearing finding set)
- **F-01 (P0):** Commit `6a5b608fb` ("PHASE 0 RATIFIED") rewrote Article I (Taloa mission), added §2.0K/2.0L/2.0M and §2.12a, marked `NORTH_STAR_SSOT.md` "CANONICAL", and inserted a 2312-line REGISTRY.json + 1659-line ENFORCEMENT_MATRIX.json — **with no ratification record**. `data/constitutional-framework/ratification-records/` does not exist. The ratification gate (`scripts/verify-constitutional-amendment-ratification.mjs`) was added *afterward* in `bc02e6b97`, whose own synopsis names `6a5b608fb` as the failure it closes.
- **F-13 (P1):** Framework fork — `CONSTITUTIONAL_FRAMEWORK.md` claims "RATIFIED / canonical" while `CONSTITUTIONAL_FRAMEWORK_v1.md` calls that same file a "working draft" it "supersedes when ratified". Both function as "the framework"; the RATIFIED one has no record and derives its authority from the unratified §2.0M.
- **F-14 (P2):** The ratification gate hard-codes exactly one protected path (`NORTH_STAR_SSOT.md`). Other files asserting SUPREME/constitutional authority — `LUMIN_COMMUNICATION_DNA.md`, `CONSTITUTIONAL_FRAMEWORK.md`, `COGNITIVE_CORE_LAWS.md` — are unguarded.
- **Positive:** the proposal `2026-08-02-NORTH_STAR_AMENDMENT.md` is correctly marked PROPOSED / not-merged. Good hygiene on that file.

**Authority map:** the only file the machine treats as truly guarded-canonical is `NORTH_STAR_SSOT.md` — but its current text includes unratified §2.0K/L/M. Everything downstream (REGISTRY → ENFORCEMENT_MATRIX → verifier scripts) inherits that unratified foundation.

## Phase 4 — Enforcement
- Real, fail-closed gates exist in `githooks/pre-commit`: file-synopsis, SSOT coupling, security invariants, BP priority, and the ratification gate.
- **F-02 (P0):** But the ratification gate is a **local pre-commit hook only**. The GitHub-API machine ship path (`services/deployment-service.js` → `commitToGitHub`, `services/governed-autonomous-shipping-loop.js`) runs no local hook and does **not** reproduce the ratification-record check. `deployment-service.js` itself comments that "a GitHub API commit runs no local hook, which is how [drift happens]." Commit `6a5b608fb` was authored via that machine path. Enforcement is therefore fail-open on the exact path most likely to be used by an autonomous agent.

## Phase 5 — Behavioral implementation
- **F-03 (P0):** 11/11 core engines (reality-alignment, confidence-vectors, human/institutional-constellation, causality-engine, readiness-engine, calibration-ledger, office-trust-ledger, chair-solomon-calibration, solomon-wisdom-lab, solomon-withheld-recommendation) have **zero runtime importers**. Referenced only by smoke tests, their own `build-*.mjs`, and existence-checking verifiers.
- **F-06 (P1):** Chair–Solomon separation logic is correct as a pure library (the one passing adversarial test) but is called by no live decision path.
- **F-04/F-05 (P1):** Calibration Ledger and Office Trust Ledger are in-memory `Map()`s — no persistence, reset on restart, never written by runtime.
- **Counter-example (proven success):** `LUMIN_COMMUNICATION_DNA.md` IS genuinely installed. `enforceCommunicationLaw()` is called on the live translation path (`chair-personality-translate.js` line ~153, reachable from real routes); `npm run lifeos:lumin:communication:verify` reproduced 7/7 PASS with real behavior tests. This proves the system *can* wire a principle — the Taloa engines simply were not.

## Phase 6 — Observability & calibration
- **F-07 (P2):** `PRINCIPLE_RUNTIME_MAP.json` maps principles to **document text presence**, not runtime (`pass_criteria: "framework contains the mission phrase"`, `required_service: null`). `verify-constitutional-learning-architecture-acceptance.mjs` checks file existence and emits `TECHNICAL_PASS`. The system cannot answer "which principle governed *this* live action" because no live action is instrumented.

## Phase 7 — Migration / hidden dependency
- See `HIDDEN_DEPENDENCY_AUDIT_2026-08-03.md`. Framework fork (F-13); confidence-engine duplication (F-09); name-collision route `/api/v1/confidence-architecture` (a child-wellness feature, not the Taloa engine).

## Phase 8 — Deployment truth
- **F-11 (P2):** Production healthy but exposes no Taloa route (`institutional-constellation` 404; `confidence-architecture` POST 404 despite HEAD mounting it → production likely trails origin/main). No deployed-SHA endpoint found, so committed≠deployed cannot be positively confirmed.

## Phase 9 — Adversarial tests
`tests/audit-taloa-runtime-reachability.test.mjs` — **1 pass / 12 fail** (11 reachability fails + 1 calibration-durability fail; the pass is the Solomon separation library). Not covered (time-boxed): live ship-blocking on a violation, risk least-invasive-response, two-twin shared-framework proof, confidence-without-provenance rejection.

## Verdict
**Mostly aspirational** at the core; overall **3/10**. The documentation and prototype layer is substantial and one adjacent law (communication DNA) is genuinely live, but the constitutional-learning heart — runtime wiring, separation of powers in a live decision, durable calibration, honest observability, legitimate ratification — is not installed. See executive summary for scores, blockers, and repair order.
