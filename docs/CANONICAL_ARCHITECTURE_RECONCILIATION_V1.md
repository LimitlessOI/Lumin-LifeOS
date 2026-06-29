<!-- SYNOPSIS: CANONICAL ARCHITECTURE RECONCILIATION V1 -->

# CANONICAL ARCHITECTURE RECONCILIATION V1

**Status:** `AUTHORITATIVE AUDIT` — read-only; no runtime code modified
**Produced:** 2026-06-13
**Evidence base:**
- `docs/SYSTEM_CAPABILITY_INVENTORY.md` (317 capabilities)
- `docs/SYSTEM_CAPABILITY_TRUTH_AUDIT.md` (mount + consumer + proof verification)
- `docs/BUILDER_EXECUTION_DUPLICATION_AUDIT.md` (6 builder execution paths)
- `docs/PASS_DONE_AUTHORITY_AUDIT_V1.md` (24 completion authorities; 1 SAFE)
- `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md` (design proposal)
- `server.js`, `startup/register-runtime-routes.js`, `startup/routes/server-routes.js`, `core/two-tier-system-init.js`, `startup/boot-domains.js`, `factory-staging/server.js`, `factory-staging/startup/register-routes.js`
- `builderos-reboot/INDEX.md`, `builderos-reboot/CURRENT_STATE.json`
- `package.json`, `services/` listing, `routes/` listing

---

## DIRECT ANSWER: THE TWO VERSIONS OF REALITY

### "If a new engineer joined tomorrow, what architecture should they believe?"

```
DOCS CLAIM:
  server.js (composition root)
    └── startup/register-runtime-routes.js  [single product mount]
    └── startup/boot-domains.js             [single scheduler boot]
  builderos-reboot/                         [BuilderOS reboot in progress]
  factory-staging/                          [new factory runtime]
  NSSOT §2.11 builder-first: system builds via POST /api/v1/lifeos/builder/build
  PASS/DONE: governed outcome verification on all completions
```

### "What architecture would actually execute in production?"

```
RUNTIME TRUTH:
  server.js (1,907 lines; still has inline routes at L1248, L1903, L1907+)
    ├── startup/register-runtime-routes.js  [modern surface; 78 route files]
    ├── startup/routes/server-routes.js     [adjunct: Stripe, legacy memory, health, queue]
    └── core/two-tier-system-init.js        [second mount bundle: site-builder, marketing,
                                              financial, auto-builder, OLD command-center-routes.js]
  BuilderOS: 6 parallel execution paths; 5 can commit without outcome verification
  PASS/DONE: 24 independent authorities; only 1 (governed loop) is SAFE
  builderos-reboot/: HIST-OWNED (HIST-AUTO-003) — archive; 33/33 missions done; not live
  factory-staging/: separate Node process port 3099; NOT in Railway production spine
```

**The gap:** Docs describe a clean single-composition-root system with governed builder-first flow. Production runs three simultaneous composition roots, six builder execution paths, and 23 PASS/DONE authorities that can grant success without outcome verification.

---

## 1. WHAT THE REPO CLAIMS THE ARCHITECTURE IS

### Claimed authority hierarchy (NSSOT → Companion → CLAUDE.md → Amendments)

```
docs/constitution/NORTH_STAR_SSOT.md [SUPREME — 688 lines]
  └── docs/constitution/NORTH_STAR_SSOT.md [digest — 103 lines]
docs/SSOT_COMPANION.md [Companion — 883 lines]
CLAUDE.md [Operating law — 184 lines]
  └── docs/AGENT_RULES.compact.md [generated enforcement packet — 42 lines]
docs/projects/AMENDMENT_01–AMENDMENT_48 [45 product SSOTs]
```

### Claimed composition model

- `server.js`: composition root only. Wires pool → middleware → routes → domains → listen. Nothing else.
- `startup/register-runtime-routes.js`: single source of all product route mounts.
- `startup/boot-domains.js`: single source of all scheduler + domain boot.
- BuilderOS: `POST /api/v1/lifeos/builder/build` is canonical execution path (NSSOT §2.11).
- PASS/DONE: governed outcome verification required (NSSOT §2.17).
- `builderos-reboot/`: active factory reboot effort, not archive.
- `factory-staging/`: new canonical runtime; will replace production spine.
- Authority: NSSOT wins all conflicts; no other file can override it.

### Claimed lifecycle flow

```
Founder request → BPB gate → builder:preflight → POST /build → governed loop →
outcome verification → verifyGovernedOutcomeBeforePass() → COMMITTED receipt → Railway deploy
```

---

## 2. WHAT THE RUNTIME ARCHITECTURE ACTUALLY IS

### Actual composition roots (three, not one)

| Root | File | What it mounts | Status |
|------|------|---------------|--------|
| **Modern product surface** | `startup/register-runtime-routes.js` | 78 route files: LifeOS phases, TC, MLS, BuilderOS, C2, memory, tokens, Voice Rail, action inbox, gate-change, deliberation, OIL | CANONICAL — use this |
| **Server adjunct** | `startup/routes/server-routes.js` | Legacy `memory-routes.js` (core/memory-system.js), Stripe, TCO, TCO Agent, health/queue | PARTIAL — partially superseded |
| **Two-tier bundle** | `core/two-tier-system-init.js` | Site builder, marketing stack, financial/billing/outreach, OLD `command-center-routes.js`, auto-builder | SHADOW — old mount bundle; `command-center-routes.js` here is not the canonical C2 aggregate |

**Plus:** `server.js` itself still has inline API routes at lines 1248, 1252, 1256, 1260 (Railway env/deploy endpoints) and L1907 (`/api/v1/queue/stats`), violating the composition-root-only boundary it declares.

### Actual runtime process map

```
Railway production:
  node server.js [port from env]
    ├── register-runtime-routes.js  (78 routes — modern)
    ├── server-routes.js            (Stripe, legacy memory — adjunct)
    ├── two-tier-system-init.js     (site-builder, auto-builder, old CC — shadow)
    └── boot-domains.js             (schedulers: twin-ingest, OIL daily, LifeOS jobs, etc.)

Local / separate process (NOT Railway production):
  node factory-staging/server.js [port 3099]
    └── factory-staging/startup/register-routes.js
          ├── POST /factory/execute-step
          ├── POST /factory/execute-mission
          ├── GET  /factory/mission-history
          ├── GET  /factory/historian/summary
          ├── GET  /factory/gates/intake
          ├── GET  /factory/c2/status
          └── GET  /factory/truth/reconcile
```

### Actual builder execution paths (6 parallel)

| # | Path | Endpoint | Mount | Can Commit | Outcome Verified |
|---|------|----------|-------|-----------|-----------------|
| 1 | Council builder direct | `POST /api/v1/lifeos/builder/build` | register-runtime-routes.js | YES | NO (FAIL_OPEN) |
| 2 | Council execute direct | `POST /api/v1/lifeos/builder/execute` | register-runtime-routes.js | YES | NO (FAIL_OPEN) |
| 3 | Governed command-control | `POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute` | register-runtime-routes.js | YES (via /build) | YES (SAFE) |
| 4 | Factory execute-step | `POST /factory/execute-step` | factory-staging/register-routes.js | NO | N/A (separate process) |
| 5 | Auto-builder legacy | `POST /api/v1/system/build`, `POST /api/build/run` | two-tier-system-init.js | YES | NO (FAIL_OPEN) |
| 6 | Shadow queue script | `scripts/lifeos-builder-continuous-queue.mjs` | npm scripts only | YES (calls /build) | NO (no governance) |

---

## 3. CANONICAL SYSTEMS

Systems that are mounted in `startup/register-runtime-routes.js`, have receipt evidence or CI proof, and are governed by a current SSOT amendment.

| System | Primary endpoint | Evidence | Amendment |
|--------|-----------------|---------|-----------|
| **BuilderOS governed loop** | `POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute` | verifyGovernedOutcomeBeforePass SAFE; CC job receipts | AM46 |
| **Builder supervisor / ready** | `GET /api/v1/lifeos/builder/ready` | builderos:control-plane:verify CI | AM46 |
| **BuilderOS control plane** | `GET /api/v1/lifeos/builder/control-plane/*` | control-plane:verify CI | AM46 |
| **OIL proof / freshness** | `GET /api/v1/lifeos/command-center/proof-freshness` | products/receipts/ | AM40 |
| **Voice Rail v1** | `POST /api/v1/lifeos/voice-rail/*` | VOICE_RAIL_V1_ACCEPTANCE.json, VOICE_RAIL_CAPABILITY_PROOF.json | AM21 |
| **Action Inbox** | `POST /api/v1/lifeos/action-inbox/*` | ACTION_INBOX_V1_ACCEPTANCE.json | AM21 |
| **LifeOS direct action** | `POST /api/v1/lifeos/direct-action` | FOUNDER_DIRECT_PROVIDER_TEST.json | AM21 |
| **Token accounting** | `POST /api/v1/lifeos/token-accounting/*` | tokens:verify CI | AM44 |
| **TC routes** | `/api/v1/tc/*` | TC morning digest module test | AM17 |
| **Gate-change council** | `POST /api/v1/lifeos/gate-change-run` | Council run receipts | AM21 |
| **BP priority guardrails** | `lifeos:bp-priority:verify` | 27-check CI; verify-bp-priority-guardrails.mjs | AM46 |
| **LifeOS auth** | `POST /api/v1/lifeos/auth/*` | wired in register-runtime-routes.js | AM21 |
| **Memory intelligence** | `GET /api/v1/lifeos/memory-intelligence/*` | wired; called by builder stack | AM39 |
| **Autonomous telemetry** | `GET /api/v1/lifeos/autonomous-telemetry/*` | wired; efficiency receipts | AM46 |
| **Capability map** | `GET /api/v1/lifeos/capability-map/*` | wired; AM20 | AM20 |

---

## 4. SHADOW SYSTEMS

Systems that exist on disk, may even produce receipts, but operate outside SSOT governance, duplicate canonical paths, or contradict BP law.

| System | File | Shadow reason | Risk |
|--------|------|--------------|------|
| **Shadow queue** | `scripts/lifeos-builder-continuous-queue.mjs` | Calls `/build` in a daemon loop without BPB gate, useful-work-guard, or outcome verification; contradicts BP law; queues JSON on disk instead of DB | HIGH |
| **Shadow queue daemon** | `scripts/lifeos-builder-daemon.mjs` | Orchestrates shadow queue | HIGH |
| **Auto-builder legacy** | `routes/auto-builder-routes.js`, `core/auto-builder.js` | Mounted via two-tier-init; `POST /api/v1/system/build` can commit + deploy with no outcome verification; no SSOT amendment | HIGH |
| **Old command-center-routes.js** | `routes/command-center-routes.js` | Mounted inside two-tier bundle (NOT the canonical C2 aggregate `lifeos-command-center-routes.js`); parallel C2 surface | MEDIUM |
| **Self-improvement-loop (legacy)** | `services/self-improvement-loop.js` | Old autonomous AI-call loop; superseded by governed loop executor and factory autopilot; still imported in server.js context | MEDIUM |
| **Self-programming (legacy)** | `services/self-programming.js` | Old self-modification service; superseded by BuilderOS governed loop | MEDIUM |
| **server.js inline Railway routes** | `server.js` L1248, L1252, L1256, L1260 | Feature routes inside the declared composition-root-only file | MEDIUM |
| **server.js inline queue stats** | `server.js` L1907 | `/api/v1/queue/stats` inline in server.js | LOW |

---

## 5. PARTIALLY MIGRATED SYSTEMS

Systems that have begun the transition from old architecture to new but are not yet fully canonical.

| System | Old path | New path | Gap |
|--------|---------|---------|-----|
| **Memory system** | `core/memory-system.js` mounted in server-routes.js | `services/memory-*.js` family mounted in register-runtime-routes.js | Both paths active simultaneously; server-routes.js still mounts legacy memory |
| **Builder `/build` direct path** | Old: auto-builder `core/auto-builder.js` | New: `routes/lifeos-council-builder-routes.js` `POST /build` | New path is canonical but FAIL_OPEN; outcome verification only on governed loop (Path 3) |
| **TCO system** | `core/tco-tracker.js` + `core/tco-sales-agent.js` mounted in server.js directly | `routes/tco-routes.js`, `routes/tco-agent-routes.js` + service layer | Both wired; old core imports still in server.js |
| **Stripe** | `routes/stripe-routes.js` imported directly in server.js (CJS import) | Should be in register-runtime-routes.js | Still mounted in server adjunct (server-routes.js) |
| **Command Center** | `routes/command-center-routes.js` (two-tier, legacy) | `routes/lifeos-command-center-routes.js` (canonical C2 aggregate in register-runtime-routes.js) | Both mounted; old one is shadow |
| **Site builder** | Mounted via two-tier-init | Routes exist as canonical files | Routes are canonical but mount path is through the shadow two-tier bundle |
| **Scheduled jobs** | `startup/boot-domains.js` handles most | Some still in server.js body (autonomy scheduler, Twilio webhook) | Mixed mount location |
| **Historian** | `factory-staging/factory-core/historian/` (canonical design) | `services/memory-*.js` (production) | Canonical Historian contract exists in factory-staging; production memory is not yet absorbing Historian boundary enforcement |

---

## 6. ABANDONED BUT STILL PRESENT

Systems that were built for a prior architecture and have not been removed.

| System | Location | Status | Safe to remove after |
|--------|---------|--------|---------------------|
| `builderos-reboot/` | Root dir | HIST-AUTO-003; 33/33 missions done; archive | Founder authorization; grep for imports first |
| Legacy `modules/` system | `modules/system/`, `modules/council/`, `modules/admin/` | `registerModules()` called from server.js but modules system was partially superseded by route files | Verify no live consumers |
| `src/` directory imports | `server.js` L952 imports from `./src/server/auth/requireKey.js`; L1581+ imports from `./src/services/` | Old monorepo `src/` tree still referenced from server.js | Remove after moving `requireKey` to canonical path |
| `audit/fsar/` + `audit/gating/` | Root `audit/` dir | `fsar_runner.js` + `execution_gate.js` imported in server.js; FSAR was prior audit system | Verify `runFSAR` / `evaluateExecutionGate` are no longer call-path critical |
| `scripts/lifeos-builder-continuous-queue.mjs` | `scripts/` | Shadow queue; contradicts BP law | After founder authorizes removal per G1 gap |
| Old `prompts/00-OPERATOR-MANDATE-COMPLETION.md` | `prompts/` | Referenced in AM21 Change Receipt as "NEW" but file was never committed (Conflict C5) | Create the file or annotate the receipt |
| `core/idea-to-implementation-pipeline.js` | `core/` | Dynamically imported in server.js body; appears to be old self-building pipeline | Verify not actively used |
| `core/dependency-auditor.js` | `core/` | Dynamically imported in server.js at L1487 | Verify not actively used |
| `core/self-modification-engine.js` | `core/` | Old SelfModificationEngine class; superseded by governed loop | Verify no current imports |

---

## 7. CURRENT AUTHORITY CHAIN

```
NSSOT (docs/constitution/NORTH_STAR_SSOT.md) — SUPREME
  │  Wins all conflicts
  │
  ├── docs/SSOT_COMPANION.md — Operational law
  │     └── docs/SSOT_DUAL_CHANNEL.md (derived)
  │
  ├── CLAUDE.md — Project operating law
  │     └── docs/AGENT_RULES.compact.md (generated)
  │
  ├── prompts/00-LIFEOS-AGENT-CONTRACT.md — Session gate
  │     ├── prompts/00-HIST-LEGACY-BOUNDARY.md (STOP gate)
  │     ├── prompts/00-SYSTEM-AUTHORITY-LAYERS.md (layer map)
  │     └── prompts/00-SSOT-READ-SEQUENCE.md
  │
  ├── docs/constitution/NORTH_STAR_SSOT.md — Digest (NOT a second supreme source)
  │
  ├── docs/projects/AMENDMENT_01–AMENDMENT_48 — Product law
  │     Each amendment is canonical for its own lane only
  │
  └── docs/products/*.md — Product specs (parallel to amendments; see Conflict C4)

CONFLICT: docs/projects/INDEX.md header still says "TSOS" as platform name;
          NSSOT says "BuilderOS" = machine. NSSOT wins. INDEX.md is stale (C1).
CONFLICT: Priority order has 4 competing sources (C3). No single canonical file today.
```

---

## 8. CURRENT EXECUTION CHAIN (production Railway)

```
HTTP Request
    │
    ▼
server.js (Express app + HTTP server)
    │
    ├── applyMiddleware() [CORS, rate limit, body parser, request-tracer, error-boundary]
    ├── registerPublicRoutes() [static assets, HTML overlays]
    ├── registerApiV1CoreRoutes() [health, env check]
    │
    ├── registerRuntimeRoutes(app, {...}) ◄── MODERN CANONICAL (78 files)
    │       Returns {tcCoordinator, wkIntegrityEngine}
    │
    ├── registerServerRoutes(app, {...}) ◄── ADJUNCT (Stripe, legacy memory, health, queue stats)
    │
    ├── initializeTwoTierSystem(app, pool, ...) ◄── SHADOW BUNDLE (site-builder, auto-builder, old CC)
    │
    ├── bootAllDomains(app, pool, ...) ◄── SCHEDULERS (OIL, twin-ingest, LifeOS jobs, governed-parity)
    │
    └── inline routes in server.js body ◄── BOUNDARY VIOLATION (railway env, queue stats)
```

---

## 9. CURRENT PASS/DONE CHAIN

**24 distinct authorities — only 1 is SAFE (both technical + outcome verification)**

```
SAFE (1):
  services/builderos-governed-loop-executor.js :: executeCommandControlJob()
    ├── OIL boundary audit
    ├── PBB plan
    ├── POST /api/v1/lifeos/builder/build  (technical verification)
    ├── verifyBuilderOutput() (4-gate)
    └── verifyGovernedOutcomeBeforePass() ← OUTCOME GATE
          YES → status: 'committed', ok: true
          NO  → FAIL_WRONG_OUTCOME

FAIL_OPEN (8, representative):
  routes/lifeos-council-builder-routes.js :: dispatchTask() [direct /build]
    └── syntax/precommit gates (technical only) — no outcome comparison
  routes/lifeos-council-builder-routes.js :: executeOutput() [direct /execute]
    └── validateGeneratedOutputForTarget() (technical only) — no outcome comparison
  routes/auto-builder-routes.js :: POST /api/v1/system/build
    └── selfBuilder.runCycle() — no outcome verification, no DONE gate
  scripts/lifeos-builder-continuous-queue.mjs
    └── calls /build in loop — inherits /build's FAIL_OPEN status

PARTIAL (12, representative):
  services/builderos-build-done-gate-helper.js :: evaluateBuildDoneGate()
    └── checks token receipt + OIL receipt + build end time (measurement only, no outcome parity)
  products/receipts/*.json
    └── PASS verdict without proof comparison to original mission objective
  factory-staging/factory-core/builder/run-step.js
    └── write + verify (technical only) — separate process; no outcome comparison
```

### PASS/DONE authority flow diagram

```
Founder instruction
        │
        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                     TODAY'S REALITY                              │
  │                                                                   │
  │  Path A (SAFE):                                                   │
  │  Voice Rail / C2 → command-control job → governed-loop-executor  │
  │    → /build → 4-gate verifier → verifyGovernedOutcomeBeforePass │
  │    → COMMITTED ✓                                                  │
  │                                                                   │
  │  Path B (FAIL_OPEN):                                             │
  │  Direct /build → precommit gates → commitToGitHub() → ok:true   │
  │  (no outcome comparison — committed content may not match request)│
  │                                                                   │
  │  Path C (FAIL_OPEN):                                             │
  │  Auto-builder /api/v1/system/build → selfBuilder.runCycle()     │
  │    → buildResult.success → no outcome gate                       │
  │                                                                   │
  │  Path D (SHADOW):                                                 │
  │  Shadow queue cron → calls /build in loop → Path B (no gate)    │
  └─────────────────────────────────────────────────────────────────┘

  Goal state (COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md):
  ALL paths → services/builderos-completion-authority.js (not yet built)
    → evaluateBuildCompletion() → grantBuildCompletion()
    → completion_receipt_id (terminal grant or fail-closed blocker)
```

---

## 10. CURRENT DEPLOYMENT CHAIN

```
Code change committed to main
        │
        ▼
  Pre-commit hooks (blocking):
    ├── §2.11 BUILDER-FIRST: staged product .js needs [system-build] or GAP-FILL
    ├── §2.15 DRIFT GATE: needs INTENT DRIFT: line
    ├── SSOT atomic: staged .js amendment must also be staged
    └── BP priority guardrails: 27 checks
        │
        ▼
  git push → GitHub main
        │
        ▼
  Railway CD (auto-deploy from main branch)
        │
        ▼
  server.js boot:
    ├── env-validator.js → fail-closed if required vars missing
    ├── migration-runner.js → auto-applies db/migrations/*.sql
    ├── registerPublicRoutes(), registerApiV1CoreRoutes()
    ├── registerRuntimeRoutes() → 78 route files mounted
    ├── registerServerRoutes() → adjunct mounted
    ├── initializeTwoTierSystem() → shadow bundle mounted
    └── bootAllDomains() → schedulers start

Manual redeploy:
  POST /api/v1/railway/deploy (server.js inline, L1260)
  or: npm run system:railway:redeploy

BLOCKER: POST /api/v1/railway/deploy returns Unauthorized (confirmed 2026-06-13)
         Railway auto-CD from push is the only verified deploy path currently.

factory-staging/ deployment:
  NOT in Railway production spine.
  Must be cut over explicitly via: npm run factory:cutover:verify + manual Railway project config.
  Status: NOT deployed to production.
```

---

## 11. CURRENT BUILDEROS CHAIN

```
Entry points:
  A. Voice Rail voice command → voice-rail-intent-router.js → voice-rail-command-executor.js
  B. C2 communication service → command-center-communication-service.js
  C. Direct API → POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute
  D. Direct API → POST /api/v1/lifeos/builder/build  [bypasses governed loop]

Governed path (A, B, C):
  builderos-governed-loop-executor.js :: executeCommandControlJob()
    ├── builderos-oil-job-audit.js [OIL boundary]
    ├── builderos-pbb-plan.js [PBB plan + target file extraction]
    ├── POST /api/v1/lifeos/builder/build (technical execution)
    │     ├── builder-instruction-target.js [file target resolution]
    │     ├── builder-blueprint-gate.js [BPB gate]
    │     ├── council-service.js [model deliberation]
    │     ├── runPrecommitGovernance() [syntax, anti-patterns, stubs]
    │     ├── commitToGitHub() / deployment-service.js
    │     └── evaluateBuildDoneGateForBuildResponse() [token/OIL/time gate — not outcome gate]
    ├── verifyBuilderOutput() [4-gate technical verifier]
    └── verifyGovernedOutcomeBeforePass() [OUTCOME GATE — only safe terminal]
          ↓ PASS → status: 'committed'
          ↓ FAIL → FAIL_WRONG_OUTCOME (fail-closed)

Shadow path (D + auto-builder):
  POST /api/v1/lifeos/builder/build (direct)
    └── [as above minus outcome gate]
    → ok: true, committed: true (FAIL_OPEN)

Factory path (separate process):
  factory-staging/ :: POST /factory/execute-step
    → run-step.js → writes file → verify → status: 'DONE'
    [not in Railway production; no commitToGitHub; separate port 3099]

BuilderOS state machine (BUILDEROS_SYSTEM_INVENTORY.md):
  NOT_WIRED → WIRED → LIVE → PROVEN → ACTIVE
  Current: builder=PROVEN; OIL=ACTIVE; council=PROVEN; memory=WIRED; TSOS-internal=NOT_WIRED
```

---

## 12. CURRENT C2 CHAIN

```
C2 has TWO parallel surfaces (one canonical, one shadow):

CANONICAL (register-runtime-routes.js):
  routes/lifeos-command-center-routes.js  [C2 aggregate]
    ├── GET  /api/v1/lifeos/command-center/phase14
    ├── GET  /api/v1/lifeos/command-center/proof-freshness
    ├── GET  /api/v1/lifeos/command-center/supervised-autonomy/readiness
    └── POST /api/v1/lifeos/command-center/...
  routes/canonical-admin-routes.js
  routes/canonical-execution-routes.js
  routes/canonical-backlog-routes.js
  routes/canonical-system-routes.js
  routes/deliberation-governance-routes.js
  routes/autonomous-telemetry-routes.js
  routes/capability-map-routes.js

SHADOW (two-tier-system-init.js mount):
  routes/command-center-routes.js  [old command center]
    └── Different endpoints; old implementation; NOT the lifeos-command-center aggregate

KEY RISK: A call hitting the old command-center-routes.js gets a different C2 response
          than one hitting lifeos-command-center-routes.js. Both are mounted simultaneously.

SERVICES:
  services/builderos-command-control-service.js → canonical job orchestration
  services/command-center-communication-service.js → C2 → governed loop bridge
  services/pb-execution-authority.js → PB authority classification
  services/supervised-autonomy-readiness.js → readiness check
```

---

## 13. CURRENT MEMORY CHAIN

```
TWO active memory mount paths:

PATH A — Modern (register-runtime-routes.js):
  routes/memory-intelligence-routes.js  [intelligence surface]
  routes/memory-capsule-routes.js       [capsule CRUD]
  routes/memory-status-routes.js        [status]
  routes/memory-self-repair-routes.js   [repair]
  routes/conversation-history-routes.js [history]
  ↓
  services/memory-intelligence-service.js
  services/memory-capsule.js
  services/memory-working.js
  services/memory-institutional.js
  services/memory-relationship.js
  services/memory-links.js
  services/memory-receipts.js
  services/memory-zombie.js  [stale detection]
  services/self-repair-memory.js

PATH B — Legacy (server-routes.js adjunct):
  routes/memory-routes.js  [core/memory-system.js — old monolithic memory]
  ↓
  core/memory-system.js

HISTORIAN STATUS:
  factory-staging/factory-core/historian/  [canonical Historian design]
    → mission-history.js, append-record.js
  NOT connected to production memory chain.
  Production memory system has not absorbed the Historian boundary contract (NSSOT §2.0I).

DB TABLES (confirmed Neon production):
  epistemic_facts, lessons_learned, memory_capsules, conversations (+ vector embedding)
```

---

## 14. CURRENT VOICE RAIL CHAIN

```
User speech input
    │
    ▼
  GET/POST /api/v1/lifeos/voice-rail/*  [register-runtime-routes.js ✓]
    │
    ▼
  routes/lifeos-voice-rail-routes.js
    │
    ├── STT: services/voice-rail-stt.js
    │
    ▼
  services/voice-rail-v1.js :: processVoiceMessage()
    │
    ├─► services/voice-rail-intent-router.js
    │       ├── detectProviderProofIntent() [FIXED 2026-06-13: AND gate removed]
    │       ├── detectSystemActionIntent()
    │       └── detectFounderCommandIntent()
    │
    ├── HARD ROUTE (provider proof):
    │   services/founder-provider-tool-action.js → live provider call → DB readback
    │   services/lifeos-direct-action.js [/api/v1/lifeos/direct-action]
    │
    ├── SYSTEM ACTION ROUTE:
    │   services/voice-rail-system-direct.js / voice-rail-system-operator.js
    │   → services/lifeos-founder-system-action.js / lifeos-founder-command-class.js
    │
    ├── COMMAND ROUTE (build/execute):
    │   services/voice-rail-command-executor.js
    │   → builderos-governed-loop-executor.js [Path 3 — SAFE]
    │
    └── CHAT FALLBACK:
        services/voice-rail-v1.js → council-service.js [chat response]

  TTS output: services/voice-rail-tts.js
  Receipt: services/voice-rail-execution-truth.js
  Memory: services/voice-rail-founder-memory.js

  KNOWN GAP: web-only (HTML mic API); no native iOS/Android mic proven
```

---

## DIAGRAMS

### Build Execution Flow

```
Founder instruction
        │
        ├─► [via Voice Rail command intent] ──────────────────────────────────┐
        │                                                                       │
        ├─► [via C2 communication service] ───────────────────────────────────┤
        │                                                                       ▼
        │                                           builderos-command-control-service.js
        │                                                       │
        │                                                       ▼
        │                                           GOVERNED LOOP (SAFE)
        │                                           builderos-governed-loop-executor.js
        │                                               ├── OIL audit
        │                                               ├── PBB plan
        │                                               ├── POST /build ──────────┐
        │                                               ├── 4-gate verify         │
        │                                               └── verifyOutcome →PASS   │
        │                                                                          │
        ├─► [direct API POST /builder/build] ──────────────────────────────────── │
        │                                           (bypasses governed loop)       │
        │                                           council-service → precommit    │
        │                                           → commitToGitHub → ok:true ◄──┘
        │                                           (FAIL_OPEN — no outcome gate)
        │
        └─► [auto-builder /api/v1/system/build] ──────────────────────────────────
                (two-tier-init mount; selfBuilder.runCycle(); no DONE gate)
                → buildResult.success (FAIL_OPEN)
```

### Command Execution Flow

```
[Voice command] ──► voice-rail-intent-router.js
                           │
                    ┌──────┴──────────────────────────┐
                    │                                  │
             Provider proof?                  Build/execute?
                    │                                  │
                    ▼                                  ▼
        founder-provider-tool-action.js    voice-rail-command-executor.js
                    │                                  │
                    ▼                                  ▼
        /api/v1/lifeos/direct-action      builderos-governed-loop-executor.js
        (live provider + DB readback)      (OIL → PBB → /build → outcome gate)
                    │                                  │
                    ▼                                  ▼
        voice-rail-execution-truth.js      status: 'committed' or FAIL_WRONG_OUTCOME
```

### PASS/DONE Authority Flow

```
Build work completes
        │
        ├─► [governed loop] → verifyGovernedOutcomeBeforePass() → COMMITTED ✓ (SAFE)
        │
        ├─► [direct /build] → evaluateBuildDoneGateForBuildResponse()
        │       → checks: token receipt + OIL receipt + end_time
        │       → done_gate_passed: true  (PARTIAL — no outcome comparison)
        │
        ├─► [direct /execute] → ok:true, committed:true (FAIL_OPEN — no gate at all)
        │
        ├─► [auto-builder] → buildResult.success (FAIL_OPEN — no gate at all)
        │
        └─► [factory execute-step] → status:'DONE' (SEPARATE PROCESS — not Railway production)

FUTURE STATE (COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md):
  ALL paths → services/builderos-completion-authority.js (NOT YET BUILT)
    → grantBuildCompletion() → completion_receipt_id
```

### Deployment Flow

```
git commit (pre-commit hook gates enforced)
        │
        ▼
git push → github.com/LimitlessOI/Lumin-LifeOS main
        │
        ▼
Railway CD (auto-deploy triggered by push)
        │
        ▼
Railway builds container → node server.js
        │
        ├── env-validator.js (fail-closed)
        ├── migration-runner.js (auto-SQL)
        ├── registerRuntimeRoutes() (78 routes — modern surface)
        ├── registerServerRoutes() (adjunct)
        ├── initializeTwoTierSystem() (shadow bundle)
        └── bootAllDomains() (schedulers)
        │
        ▼
Production serving (Railway URL)

factory-staging/ ──► NOT in this flow ──► separate local process only
builderos-reboot/ ──► HIST archive ──► npm run factory:* scripts only
```

---

## TOP 25 CANONICAL SYSTEMS

Ranked by: mounted in register-runtime-routes.js + has CI/receipt proof + SSOT amendment owned.

| Rank | System | Evidence grade |
|------|--------|---------------|
| 1 | BuilderOS governed loop executor (`builderos-governed-loop-executor.js`) | SAFE (only outcome-verified path) |
| 2 | Voice Rail v1 (`voice-rail-v1.js` + stack) | VOICE_RAIL_CAPABILITY_PROOF.json; ACCEPTANCE.json |
| 3 | Action Inbox (`action-inbox.js`) | ACTION_INBOX_V1_ACCEPTANCE.json |
| 4 | BP priority guardrails (27-check CI) | CI: `lifeos:bp-priority:verify` |
| 5 | BuilderOS control plane (`builderos-control-plane-service.js`) | CI: `builderos:control-plane:verify` |
| 6 | OIL proof + security receipts | products/receipts/ trail |
| 7 | Token accounting (`token-accounting-service.js`) | CI: `tokens:verify` |
| 8 | LifeOS direct action (`lifeos-direct-action.js`) | FOUNDER_DIRECT_PROVIDER_TEST.json |
| 9 | TC routes + coordinator (`tc-routes.js`, `tc-coordinator.js`) | TC morning digest module test |
| 10 | Gate-change council runner | Council run receipts |
| 11 | Governed proof parity (boot scheduler) | Boot-time scheduled; parity logs |
| 12 | Memory intelligence service | Consumed by builder stack + telemetry |
| 13 | Useful work guard (`useful-work-guard.js`) | Used by all scheduled AI calls |
| 14 | Autonomous telemetry (`autonomous-telemetry-service.js`) | Efficiency receipts |
| 15 | Pre-commit hook enforcement | Blocks commits daily |
| 16 | LifeOS auth (`lifeos-auth.js`) | User registration PROVEN |
| 17 | Env validator (`env-validator.js`) | Boot-time fail-closed |
| 18 | Migration runner | Auto-applies on every deploy |
| 19 | Deliberation governance | Council + gate-change gated |
| 20 | Capability map (`capability-map.js`) | AM20; wired in register-runtime |
| 21 | Builder preflight (`council-builder-preflight.mjs`) | `npm run builder:preflight` |
| 22 | OIL daily summary scheduler | 24h scheduled; receipts |
| 23 | TSOS token optimizer (`token-optimizer.js`, `tokenos-service.js`) | wired; receipts |
| 24 | Deployment service (`deployment-service.js`) | `commitToGitHub()` called by /build |
| 25 | Council service (`council-service.js`) | Core of /build and gate-change |

---

## TOP 25 SHADOW SYSTEMS

Systems that exist, execute, but operate outside SSOT/BP governance or duplicate canonical paths.

| Rank | System | Why shadow | Risk |
|------|--------|-----------|------|
| 1 | Shadow queue (`lifeos-builder-continuous-queue.mjs`) | Calls /build in daemon loop; no BPB gate; no outcome verification; contradicts BP law (G1) | CRITICAL |
| 2 | Auto-builder legacy (`routes/auto-builder-routes.js`, `core/auto-builder.js`) | Mounted via two-tier; can commit + deploy; no DONE gate; no outcome gate | HIGH |
| 3 | Old command-center-routes.js (two-tier mount) | Parallel C2 surface; not the canonical C2 aggregate; different behavior on same express app | HIGH |
| 4 | Direct `/build` bypassed from governed loop | Any caller directly hitting `/api/v1/lifeos/builder/build` bypasses outcome gate | HIGH |
| 5 | Direct `/execute` (`routes/lifeos-council-builder-routes.js`) | Can commit without outcome gate or DONE gate | HIGH |
| 6 | Shadow queue daemon (`scripts/lifeos-builder-daemon.mjs`) | Orchestrates shadow queue | HIGH |
| 7 | server.js inline Railway env routes (L1248–1260) | Feature code inside declared composition root | MEDIUM |
| 8 | server.js inline queue stats (L1907) | Same boundary violation | MEDIUM |
| 9 | `core/self-modification-engine.js` | Old self-modification; not in governed loop | MEDIUM |
| 10 | `services/self-improvement-loop.js` | Old autonomous AI loop; superseded | MEDIUM |
| 11 | `services/self-programming.js` | Old self-programming; superseded by governed loop | MEDIUM |
| 12 | Autonomy scheduler (old) (`services/autonomy-scheduler.js`) | Old scheduler system alongside `startup/schedulers.js` | MEDIUM |
| 13 | Legacy modules system (`modules/` dir, `registerModules()`) | `registerModules()` called in server.js; superseded by route file pattern | MEDIUM |
| 14 | `core/idea-to-implementation-pipeline.js` | Dynamically imported in server.js; old build pipeline | MEDIUM |
| 15 | `services/chatgpt-import.js` | Legacy import; no active consumer in new spine | LOW |
| 16 | `core/dependency-auditor.js` (server.js L1487) | Old dependency audit; dynamically imported | LOW |
| 17 | `audit/fsar/fsar_runner.js` (server.js top) | FSAR was prior audit system; still imported | LOW |
| 18 | `audit/gating/execution_gate.js` (server.js top) | Same FSAR era | LOW |
| 19 | `src/server/auth/requireKey.js` (server.js L952) | `src/` tree in an ESM project; violates module structure | LOW |
| 20 | `src/services/` dynamic imports (server.js L1581–1624) | Old services in `src/` tree dynamically imported | LOW |
| 21 | `core/ollama-installer.js` (server.js L1753) | Old Ollama setup; dynamically imported | LOW |
| 22 | JSON-file shadow queue artifacts (`data/*.json`) | Queue state stored in JSON files instead of DB | LOW |
| 23 | `builderos-reboot/BP_PRIORITY.json` in active use | HIST-owned file referenced as "canonical_work_queue" in CURRENT_STATE | LOW |
| 24 | `services/autonomous-efficiency-intelligence.js` | Older autonomy pattern; BuilderOS metrics reporter is canonical | LOW |
| 25 | `factory-staging/` as production claim | Docs imply this will replace production; it is currently a separate local process on 3099 | INFO |

---

## TOP 25 HALF-MIGRATED SYSTEMS

Systems that are partially in the new architecture but retain old wiring or incomplete governance.

| Rank | System | Old state | New state | Remaining gap |
|------|--------|---------|---------|--------------|
| 1 | Memory system (dual mount) | `core/memory-system.js` in server-routes.js | `services/memory-*.js` family in register-runtime-routes.js | Both paths active; old mount not removed |
| 2 | TCO system | `core/tco-tracker.js` + `core/tco-sales-agent.js` direct in server.js | `routes/tco-routes.js` in server-routes.js | Core classes still instantiated in server.js |
| 3 | Stripe | server.js direct import `stripeRoutes` | Should be in register-runtime-routes.js | Still in server adjunct |
| 4 | Site builder mount | two-tier-system-init.js | Routes are canonical files | Mount path is through shadow two-tier bundle |
| 5 | Builder /build → outcome gate | /build commits without outcome gate | Governed loop wraps /build with outcome gate | Any direct /build caller skips the gate |
| 6 | Historian | `factory-staging/factory-core/historian/` (design) | `services/memory-*.js` (production) | Canonical boundary contract not enforced in production |
| 7 | LifeOS product spec | `docs/products/LIFEOS.md` exists + AMENDMENT_21 | AM21 is canonical; voice-rail code reads AM21 | CLAUDE.md read order still points to products path (C4) |
| 8 | BuilderOS DONE gate | No outcome gate before commit | evaluateBuildDoneGateForBuildResponse (measurement only) | Full outcome comparison not yet wired to /build directly |
| 9 | Autonomy scheduler | `services/autonomy-scheduler.js` (old) | `startup/schedulers.js` (new) | Old still imported; new is the pattern |
| 10 | Request auth | `src/server/auth/requireKey.js` (old src path) | Should be in `services/` or `middleware/` | Still referenced from old src tree |
| 11 | Marketing routes | two-tier-system-init.js mount | Routes are canonical files | Mount path still through shadow bundle |
| 12 | Platform kernel (TSOS) | Not wired to BuilderOS internal hooks | `services/tsos-platform-kernel.js` routes active | TSOS internal hooks for BuilderOS NOT_WIRED (§4 of BUILDEROS_SYSTEM_INVENTORY) |
| 13 | Outreach / email | two-tier-init mount | Routes are canonical files | Postmark env vars unset (G3) |
| 14 | Financial routes | two-tier-init mount | Routes are canonical files | Mount path still through shadow bundle |
| 15 | Self-repair system | `services/emergency-repair.js` (old) | Full self-repair stack mounted | Boot-check scheduler active; full prevention hook system newer |
| 16 | TSOS efficiency routes | In register-runtime-routes.js | In register-runtime-routes.js | No dedicated receipt or CI proof yet |
| 17 | Deliberation governance | Routes and services wired | Mounted in register-runtime-routes.js | No accepted receipt for deliberation outcomes |
| 18 | Kids OS | `routes/kids-os-routes.js` (on disk) | `routes/lifeos-children-routes.js` (register-runtime-routes.js) | Two kids routes; which is authoritative? |
| 19 | LifeOS copilot | `routes/lifeos-copilot-routes.js` (disk) | Not confirmed in register-runtime-routes.js | May be dynamically mounted or orphaned |
| 20 | LifeOS simulator | `routes/lifeos-simulator-routes.js` (disk) | Partially referenced | Mount status unconfirmed (§SYSTEM_CAPABILITY_TRUTH_AUDIT optional dynamic mounts) |
| 21 | Model performance | `routes/model-performance-routes.js` in register-runtime-routes.js | Wired | No dedicated CI proof |
| 22 | Wearable integration | `services/wearable-integration/` dir | `services/healthkit-bridge.js` exists | iOS hook not proven |
| 23 | Lane intel scheduler | `services/lane-intel-service.js` | Boot-scheduled (gated `LANE_INTEL_ENABLE_SCHEDULED=1`) | Gated off by default; not proven in production |
| 24 | LifeOS scheduled jobs | `services/lifeos-scheduled-jobs.js` | Boot-scheduled (gated `LIFEOS_ENABLE_SCHEDULED_JOBS=1`) | Gated off by default |
| 25 | Factory-staging cutover | `factory-staging/` complete (33/33 missions done) | Not in Railway production | Cutover verification script exists (`factory:cutover:verify`) but not executed |

---

## TOP 25 ARCHIVE CANDIDATES

Safe to remove or externalize after grepping for active consumers. Highest-confidence first.

| Rank | Path | Reason | Verify first |
|------|------|--------|-------------|
| 1 | `builderos-reboot/MISSIONS/` 33 completed mission packs | HIST-AUTO-003; 33/33 done; archive per Hist boundary law | `grep -r "FACTORY-REBOOT" routes/ services/ startup/` |
| 2 | `scripts/lifeos-builder-continuous-queue.mjs` | Shadow queue; contradicts BP law (G1) | Founder authorization required |
| 3 | `scripts/lifeos-builder-daemon.mjs` | Orchestrates shadow queue | Same as above |
| 4 | `services/self-programming.js` | Superseded by governed loop | Grep consumers |
| 5 | `services/self-improvement-loop.js` | Superseded by factory autopilot | Grep consumers |
| 6 | `core/self-modification-engine.js` | Old SelfModificationEngine class | Grep consumers |
| 7 | `core/idea-to-implementation-pipeline.js` | Old pipeline; dynamically imported in server.js | Verify no live use |
| 8 | `core/dependency-auditor.js` | FSAR era; dynamically imported in server.js | Verify no live use |
| 9 | `audit/fsar/fsar_runner.js` | FSAR prior audit system; imported in server.js | Move import or remove |
| 10 | `audit/gating/execution_gate.js` | Same FSAR era | Move import or remove |
| 11 | `backups/` (~1k files) | Not in spine; DELETE-CANDIDATE per REPO_TRIAGE_NOTES | Grep then remove |
| 12 | `logs/` (versioned logs, ~2.8MB) | Logs should not be versioned | Add to .gitignore, delete tracked copies |
| 13 | `routes/command-center-routes.js` | Old command center; parallel shadow surface to canonical C2 | Grep two-tier mounts then remove |
| 14 | `my_project/`, `my-project/` dirs | Scratch names per REPO_TRIAGE_NOTES | Grep imports |
| 15 | `docs/THREAD_REALITY/` (~367k files, ~1.4GB) | Excluded from catalog; excluded in .gitignore; massive | Move out of repo |
| 16 | `src/server/auth/requireKey.js` | Old src/ tree in ESM project | Move to middleware/ then remove |
| 17 | `src/services/` (sales, coaching, calendar, goal, etc.) | Legacy services dynamically imported in server.js | Port to services/ or remove |
| 18 | `core/ollama-installer.js` | Old Ollama setup; dynamically imported | Verify no live use |
| 19 | Old `migrations/` root dir | Parallel to `db/migrations/`; REVIEW per REPO_TRIAGE_NOTES | Pick one authoritative path |
| 20 | `database/` root dir | Parallel to `db/`; same conflict | Same |
| 21 | `data/` JSON queue files (shadow queue state) | State should live in DB; not git | After shadow queue removed |
| 22 | `scripts/analyze-historical-server.js` | Historical analysis; Hist-era | Verify not in active use |
| 23 | `builderos-reboot/PARTS_CAR_MANIFEST.json` artifacts | Hist archive | After reboot fully archived |
| 24 | `audit/reports/` generated FSAR artifacts | Generated; excluded from catalog; prune committed copies | Per REPO_TRIAGE_NOTES |
| 25 | `docs/THREAD_REALITY/` partial git-tracked entries | Same as rank 15 | git rm --cached + .gitignore |

---

## KEY FINDINGS

### Biggest architecture lie

**The "single composition root" claim.**

`CLAUDE.md` and `server.js` both declare that `server.js` is a composition root only and that `startup/register-runtime-routes.js` is the single product mount. In reality, production runs **three simultaneous composition roots** (`register-runtime-routes.js`, `server-routes.js`, `two-tier-system-init.js`) plus inline routes in `server.js` itself, and a completely separate process (`factory-staging/server.js`) that documents imply is the future production runtime but is not in Railway today.

### Biggest architecture truth

**The governed loop executor is genuinely safe.**

`services/builderos-governed-loop-executor.js` with `verifyGovernedOutcomeBeforePass()` is the only path in the entire system that requires both technical verification AND outcome comparison before granting a terminal success status. Every other commit path is either fail-open or partial. This is the right pattern and the consolidation plan correctly identifies it as the target for all other paths to converge on.

### Highest-risk shadow system

**Shadow queue (`scripts/lifeos-builder-continuous-queue.mjs`).**

It calls `POST /api/v1/lifeos/builder/build` in a daemon loop, stores queue state in JSON files instead of DB, has no BPB gate, no useful-work-guard, no outcome verification, and contradicts BP law. It can commit code to GitHub without any of the governed loop's protections. If it is running in any environment, it is the highest-risk path for wrong-outcome commits.

### Recommended next consolidation target

**Three-root composition → single root.**

The cleanest win with the highest leverage:
1. Move `two-tier-system-init.js` mounts into `register-runtime-routes.js` (site-builder, marketing, financial, outreach routes are already canonical files — only the mount location is wrong)
2. Remove old `command-center-routes.js` from the two-tier bundle (the canonical C2 aggregate is already mounted in register-runtime-routes.js)
3. Move remaining server-routes.js mounts (Stripe, legacy memory) into register-runtime-routes.js or remove the legacy memory-routes.js entirely
4. This collapses three composition roots to one — zero behavior change for modern routes, removes the parallel C2 surface, eliminates the two-tier shadow bundle

---

*No runtime code was modified in the production of this document.*  
*Phase 2 actions require founder authorization per amendment.*
