# EXECUTION CONSOLIDATION FEASIBILITY V1

Status: AUTHORITATIVE EXECUTION FEASIBILITY AUDIT (read-only; no runtime edits)  
Produced: 2026-06-13  
Mission: Execution Consolidation Authority (execution reality only)

## Inputs (required)

- `docs/CANONICAL_BUILD_EXECUTION_PATH_V1.md`
- `docs/ARCHITECTURE_CONSOLIDATION_DECISION_PACK_V1.md`
- `docs/THREE_ROOT_CONSOLIDATION_DEEP_AUDIT_V1.md`
- `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md`

---

## Consolidation Classification

## SAFE NOW

1. Remove dead duplicate `GET /api/v1/queue/stats` in `server.js` (ROOT B already serves first-match).
2. Remove four inline 410 railway tombstone endpoints in `server.js` (`/api/v1/railway/env*`, `/api/v1/railway/deploy`).
3. Remove duplicate ROOT C mounts already mounted earlier in ROOT A:
   - `enhanced-council-routes.js`
   - `api-cost-savings-routes.js`
4. Keep governed command-control -> `/builder/build` as execution chain authority (no path changes required for this classification).

## SAFE WITH TESTS

1. Collapse ROOT B mounts into ROOT A for non-shadow, low-coupling routes:
   - Stripe webhook/routes, flags, ops telemetry, healthz, queue stats.
2. Move ROOT C route files marked safe in deep audit (site-builder report/discovery, financial, business, game, video, boldtrail, web-intel, outreach, billing, knowledge, conversation, two-tier-council).
3. Remove redundant legacy memory second mount (`/api/v1/memory/legacy`) only after consumer proof.
4. Retire old `command-center-routes.js` only after path-by-path consumer/migration proof.

## HIGH RISK

1. Retiring `routes/auto-builder-routes.js` without explicit founder authorization and regression proof.
2. Removing ROOT C old command-center routes that still have unique endpoints (`/internal/cron/*`, backlog/task queue variants) before compatibility mapping.
3. Consolidating memory broad `/api` mount without consumer audit.
4. Assuming completion authority is already terminally unified on kernel path (it is still partially deferred/split in current chain).

## DO NOT TOUCH

1. OIL boundary gate and zone policy as a bypass target (especially disabling `ZONE3_PATCH_REQUIRED`).
2. Governed outcome verifier (`verifyGovernedOutcomeBeforePass`) as a terminal gate.
3. BP priority guardrails and SSOT/pre-commit enforcement stack.
4. Canonical command-control orchestration intake (`/api/v1/lifeos/builderos/command-control/jobs/:id/execute`).
5. Hist boundary law (do not re-promote Hist-owned artifacts as execution authority).

---

## Direct Answers

### 1) Which consolidations are safe immediately?

- Dead duplicate and tombstone route deletions already identified as no-behavior-change in three-root audit Phase 0/1.
- Removing duplicate ROOT C mounts that are already served by ROOT A first-match.

### 2) Which consolidations require proof first?

- ROOT B memory mount consolidation.
- ROOT C old command-center retirement.
- Any move of routes with unclear dependency initialization (`life-coaching`, `agent-recruitment`, TCO mount path).
- Any retirement of auto-builder surfaces (requires founder authorization + test proof).

### 3) Which consolidations would likely break production?

- Aggressive removal of ROOT C old command-center endpoints before confirming live consumers.
- Removing `/api` legacy memory mount without path consumer validation.
- Changing builder path authority order (DONE/completion/outcome) without preserving governed-loop pass/fail semantics.

### 4) Which systems are actually executing today?

- Railway production app with three roots active: ROOT A + ROOT B + ROOT C (+ inline server routes).
- Governed command-control execution chain into `/api/v1/lifeos/builder/build`.
- Voice Rail command routing into command-control jobs.
- Canonical C2 aggregate routes in ROOT A.

### 5) Which systems only appear canonical on paper?

- “Single composition root” claim (paper), while runtime still executes three roots.
- “Single terminal completion writer” claim (target), while runtime still has split completion/done/outcome surfaces.
- “Factory-staging as canonical runtime” claim without production cutover receipt.

### 6) Which systems are receiving real runtime traffic?

Evidence-backed traffic surfaces (from referenced audits/receipts):
- Voice Rail API surfaces (`/api/v1/lifeos/voice-rail/*`) including founder command execution.
- Command-control job creation/execution surfaces.
- `/api/v1/lifeos/builder/build` via governed loop dispatch.
- C2 communication send/poll surfaces linked to command-control.
- Production health and deploy verification endpoints used in operational checks.

### 7) Which systems are effectively dead?

- Dead duplicate inline `server.js` queue stats route (shadowed by ROOT B).
- ROOT C duplicate mounts for enhanced-council and api-cost-savings (shadowed by ROOT A first-match).
- Inline railway tombstone endpoints are effectively legacy stubs (410 wrappers, not active functional authority).

### 8) What is the shortest path to a single execution chain?

1. Execute only zero-risk dead duplicate removals first.
2. Lock commit authority to governed command-control -> `/builder/build` only (policy enforcement; no fallback authority).
3. Retire non-canonical commit surfaces in controlled order:
   - old command-center autonomous build triggers
   - auto-builder commit endpoints
   - `/builder/execute` fallback authority
4. Finish terminal unification so kernel-managed build completion is granted by one authority after evidence collection.
5. Collapse ROOT B/ROOT C mounts into ROOT A incrementally with phase smoke tests.

---

## Biggest Paper-vs-Runtime Mismatch

The largest mismatch is composition-root truth: governance doctrine assumes a single canonical runtime mount chain, but production currently executes three composition roots simultaneously, with shadow execution surfaces still active.

---

## WHAT SHOULD C2.5 REVIEW NEXT

Unverified assumptions that remain governance-critical:

1. Whether old ROOT C command-center endpoints (`/internal/cron/*`, backlog/task queue variants) still have active runtime consumers.
2. Whether any production automation still calls auto-builder endpoints (`/api/v1/system/build`, `/api/build/run`).
3. Whether legacy memory broad mount (`/api`) has hidden consumers that would break on consolidation.
4. Whether kernel-managed completion sequencing now produces one terminal authority in all success/failure permutations.
5. Whether TCO route mount path is fully understood (noted as unclear in deep audit).

Recommended C2.5 mission:
- **Consumer-and-traffic proof audit for shadow endpoints before retirement** (old C2, auto-builder, legacy memory broad mount).

---

## WHAT SHOULD CODEX REVIEW NEXT

Recommended next Codex mission:

- **Execution authority hardening pre-implementation audit pack**:
  - produce a file-by-file retirement order for non-canonical commit surfaces,
  - include rollback and smoke checks per step,
  - prove no canonical path regression against governed command-control -> `/builder/build`.

This keeps implementation scope tight and avoids re-discovery while moving directly toward a single execution chain.

---

## Feasibility Verdict

PASS — consolidation is feasible in staged order, with immediate zero-risk wins available now and high-risk retirements gated behind traffic/consumer proof and founder authorization.
