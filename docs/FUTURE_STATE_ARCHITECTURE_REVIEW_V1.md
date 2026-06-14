# Future State Architecture Review V1

**Status:** `AUTHORITATIVE REVIEW` (external systems architect lens — doc-only)  
**Date:** 2026-06-14  
**Agent:** Composer (Cursor)  
**Environment:** Local repo audit — `/Users/adamhopkins/Projects/Lumin-LifeOS`  
**Mission role:** Future-state architecture review for autonomous-operation readiness  
**Mode:** Planning and auditing — **no runtime code modified**

**Primary inputs:**
- `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md`
- `docs/THREE_ROOT_CONSOLIDATION_DEEP_AUDIT_V1.md`
- `docs/PASS_DONE_AUTHORITY_AUDIT_V1.md` *(substitute — `AUTHORITY_CONSOLIDATION_MASTER_AUDIT_V1.md` not present on disk)*
- `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md`
- `docs/BUILDEROS_CONSOLIDATION_ROADMAP_V1.md`
- `docs/BUILD_EXECUTION_BLOCKER_SEQUENCE_PLAN_V1.md`
- `docs/TSOS_PLATFORM_KERNEL.md`

**Review question:** If this system were prepared for **autonomous operation**, what survived, drifted, should be removed, protected, over-governed, and under-governed?

---

## Executive verdict (autonomous-operation readiness)

| Dimension | Today | Autonomous-ready? |
|-----------|-------|-------------------|
| **Infra connectivity** | Providers, Neon, Railway, GitHub sync — CONNECTED | Yes |
| **Single composition truth** | Three roots + inline server.js | No |
| **Single execution path** | Six builder paths; one SAFE | No |
| **Single completion authority** | 24 writers; consolidation in flight | No |
| **End-to-end governed build** | Blocked at ZONE3 + DONE gate ordering | No |
| **Capability surface** | 317 inventoried; 63 ACTIVE | Partial |
| **Product delivery** | Voice Rail, Action Inbox technical PASS | Partial |

**Bottom line:** The **TSOS platform vision** (kernel, receipts, builder-first, zero-waste) survived as **design and partial implementation**. Autonomous operation is blocked not by missing cloud APIs but by **authority fragmentation** and **mount/execution duplication**. Consolidation is the prerequisite for safe autonomy — not more features.

---

## 1. What parts of the original TSOS vision survived?

The original TSOS / TokenSaverOS vision (Am 10, Am 44, `TSOS_PLATFORM_KERNEL.md`, NSSOT builder-first law) intended:

- One **platform kernel** wrapping AI, build, and review with mandatory receipts  
- **Token accounting** as supreme metering layer  
- **Builder-first** product delivery via governed `/build`  
- **Zero-waste** scheduled AI (`useful-work-guard`)  
- **OIL** as verification / security division  
- **Fail-closed** execution without proof  
- **LifeOS as product**, **BuilderOS as machine**, **TSOS as platform metabolism**

### Survived (implemented + evidenced)

| Vision element | Where it lives | Proof |
|----------------|----------------|-------|
| Token metering law | Am 44, `token-accounting-service.js`, `savings-ledger.js` | `tokens:verify` CI |
| Platform kernel (Phase 0) | `services/tsos-platform-kernel.js` — `wrapBuild`, `wrapCouncilMember` | Wraps `/builder/build` on production |
| Builder-first HTTP actuator | `POST /api/v1/lifeos/builder/build` | `/builder/ready`, pre-commit §2.11 |
| Governed loop + outcome verify | `builderos-governed-loop-executor.js` | Only SAFE completion path in audit |
| OIL receipts + proof freshness | `oil-security-receipts.js`, C2 proof-freshness | Product receipts trail |
| Control plane / build ledger | `builderos-control-plane-service.js`, `build_task_ledger` | `builderos:control-plane:verify` |
| Useful-work guard | `useful-work-guard.js` | Boot law for schedulers |
| BP priority as machine queue | `builderos-reboot/BP_PRIORITY.json` | 27-check pre-commit HARD |
| Voice Rail as founder interface | `lifeos-voice-rail-routes.js` | ACCEPTANCE + capability proof |
| Command-control orchestration | CC jobs API | Live job receipts |
| Factory canonical runtime (separate) | `factory-staging/server.js` | Execute-step, intake gate slice |
| Railway self-deploy / managed env | `railway-managed-env-routes.js` | Live autosync status |
| Completion authority (started) | `builderos-completion-authority.js` | Step 1 on `/build` path |

### Survived (doctrine / docs, not fully runtime-enforced)

- NSSOT hierarchy (NSSOT → Companion → amendments)  
- Hist vs Machine boundary law  
- Historian contract (factory-staging; production partial)  
- CCL as future meaning transport (Am 45 — paper phase)  
- Single composition root **as stated policy** (not yet runtime fact)

---

## 2. What parts have drifted?

| Claimed | Actual | Drift severity |
|---------|--------|----------------|
| Single composition root (`server.js` wires one register) | **Three roots** (A/B/C) + inline routes | **Critical** |
| Builder-first = one execution path | **Six paths** can commit or mark success | **Critical** |
| Outcome verification on all PASS/DONE | **1 SAFE**, **8 FAIL_OPEN**, **12 PARTIAL** | **Critical** |
| `builderos-reboot/` active factory | **Hist-owned archive**; BP_PRIORITY is queue | **High** |
| `factory-staging/` replaces spine | Separate process; **not** Railway production | **High** |
| TSOS = unified platform name (NSSOT) vs TSOS = efficiency layer (brainstorm) | Vocabulary split unresolved | **Medium** |
| 317 capabilities PRESENT | **63 ACTIVE**, 219 PARTIAL | **High** |
| server.js composition-only | 1907 lines; inline routes; legacy imports | **High** |
| DONE gate = delivery proof | Measurement only; blocks before outcome authority | **High** |
| Autonomous overnight queue | Shadow JSON queue vs BP_PRIORITY law | **High** |
| Auto-builder self-cycle | Parallel commit path via two-tier init | **High** |
| C2 single aggregate | Old `command-center-routes.js` + canonical `lifeos-command-center-routes.js` | **Medium** |
| Memory Historian on production | Factory historian live; production memory dual-path | **Medium** |

**Biggest drift (single sentence):** Documentation and operator mental model describe a **unified governed platform**; production executes a **layered accretion stack** with multiple ways to commit code and declare success.

---

## 3. What parts should be removed?

Prioritized for autonomous operation — retire, do not extend.

| Target | Why remove | Audit ref |
|--------|------------|-----------|
| Shadow queue + daemon queue phase | Parallel queue; bypasses CC/outcome | Reconciliation §4, Retirement Plan |
| Auto-builder commit endpoints | Parallel git authority | Duplication audit #5 |
| `POST /builder/execute` as public API | Commit bypass | Duplication audit #2 |
| Governed-loop `/execute` fallback | Hidden non-canonical commit | Retirement Plan Path 2 |
| Duplicate route mounts (enhanced-council, api-cost-savings in ROOT C) | Dead code; mount confusion | Three-root Phase 1 |
| Old `command-center-routes.js` bundle | Shadow C2 | Three-root Phase 4 |
| `GET /api/v1/queue/stats` inline duplicate | Dead duplicate | Three-root §2 |
| Dev commit tools in production profile | `dev/commit`, `replace-file` without env gate | Three-root ROOT B |
| `self-improvement-loop`, `self-programming` as execution | Superseded by governed loop | Reconciliation §4 |
| `lumin-factory/` duplicate tree | Drift risk vs `factory-staging/` | Consolidation roadmap FAC-8 |
| Hist mission queue artifacts for product work | Wrong domain | BP law |
| Orphan route files (14 disconnected) | Agent confusion; false PRESENT | Truth audit |

**Do not remove yet:** `factory-staging/` (canonical factory runtime), `builderos-reboot/BP_PRIORITY.json` (machine queue), two-tier **site-builder/TC revenue routes** until migrated to ROOT A.

---

## 4. What parts should be protected?

These are the **load-bearing spine** for any future autonomous operation. Do not weaken during consolidation.

| Asset | Protect because |
|-------|-----------------|
| **Governed loop executor** | Only outcome-verified build orchestration today |
| **Command-control jobs API** | Single orchestration intake for Voice Rail / C2 |
| **`verifyGovernedOutcomeBeforePass`** | Wrong-outcome regression guard |
| **`builderos-completion-authority.js`** (and completion toward sole terminal writer) | Closes FAIL_OPEN class |
| **BP priority guardrails + verify** | Prevents Hist/product queue drift |
| **`useful-work-guard`** | Zero-waste law for scheduled autonomy |
| **Pre-commit hooks** (SSOT, builder-first, INTENT DRIFT) | Last line before git pollution |
| **TSOS platform kernel wrap** | Measurement + ledger on `/build` |
| **Token accounting + OCL** | Cost truth for autonomous scaling |
| **OIL security receipts** | Verification division |
| **Voice Rail execution truth** | Honest founder comms (`fail_closed_founder_comms`) |
| **`register-runtime-routes.js` (ROOT A)** | Canonical modern surface |
| **`railway-managed-env-routes.js`** | Self-deploy and vault sync |
| **Amendment SSOT chain** | Conflict resolution for agents |
| **Hist boundary law** | Prevents legacy salvage from becoming active queue |
| **Zone 3 / patch-mode policy** | Prevents stub commits on large files |
| **Product acceptance receipts** | Technical PASS evidence (when linked to completion authority) |

---

## 5. What parts are over-governed?

Over-governance = friction and false blocks **without** proportional safety gain, or **duplicate gates** that fight each other.

| Area | Symptom | Recommendation |
|------|---------|----------------|
| **DONE gate as terminal blocker** | Blocks HTTP success before completion authority; requires ledger rows `/build` does not always write | **Demote** to evidence-only (Consolidation Phase 3) |
| **24 PASS/DONE authorities** | Agents cannot know which "PASS" counts | **Collapse** to completion authority |
| **Three composition roots** | Mount ambiguity; duplicate handlers | **Collapse** to ROOT A (+ thin adjunct until merged) |
| **Pre-commit + DONE gate + outcome + OIL boundary** | Sequential blocks without unified error surface | **Unify** blocker vocabulary (`completion_granted`, `blocker_code`) |
| **317-row inventory marked PRESENT** | False confidence; rebuild loops | **Truth audit** as gate, not inventory size |
| **Zone 3 on proof scripts without extract-helper path** | Blocks all standard acceptance targets | **Not remove policy** — add **automated extract-helper PBB** so governance is satisfiable |
| **Multiple builder npm scripts** | Supervisor, queue, daemon, overnight — overlapping | **One** canonical runner (`governed-overnight-backlog-run.mjs`) |
| **Docs/amendments vs runtime** | Agents read law that runtime does not enforce | **Mount truth CI** over more prose |

**Not over-governed (resist pressure to weaken):** outcome verification, zone 4 blocks, precommit governance, useful-work guard, BP priority verify.

---

## 6. What parts are under-governed?

| Area | Risk | Gap |
|------|------|-----|
| **Direct `/builder/build`** | Wrong outcome + `committed: true` | Completion authority partial; DONE ordering wrong |
| **`/builder/execute`** | Commit without full gates | Still mounted FAIL_OPEN |
| **Auto-builder** | Silent parallel commits | Two-tier shadow |
| **Shadow queue** | Autonomous `/build` loop | Quarantined but executable |
| **Acceptance scripts → BP sync** | Orphan PASS without outcome | No `completion_receipt_id` choke |
| **Mount registry** | Sleep routes, marketing routes disconnected | Truth audit regression |
| **Dev tools on production server** | Arbitrary file replace / commit | No `NODE_ENV` gate |
| **Factory vs production boundary** | Accidental git authority merge | No cutover receipt enforcement |
| **Historian on production spine** | Hist writes from Machine paths | Boundary not runtime-enforced |
| **End-to-end build proof** | Infra connected; job never `committed` | Measurement wiring + zone targets |
| **Decision ledger** | Planned kernel authority driver | Missing (Am 46 §4.4) |
| **Product development gate** | "BPB may begin now" | Factory slice only |
| **CCL meaning transport** | Future M2M efficiency | Not implemented (acceptable defer) |

**Most dangerous under-governance:** Any path that can **commit to `main`** without **outcome verification** — still 5+ actuators per duplication audit.

---

## Architecture that should exist after consolidation

Target state for **safe autonomous operation** (12–18 month engineering horizon):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FOUNDER / PRODUCT LAYER                          │
│  Voice Rail · Action Inbox · LifeOS phases · TC/Revenue products         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATION (single intake)                         │
│  BP_PRIORITY.json ──► command-control jobs ──► governed-loop-executor    │
│  governed-overnight-backlog-run.mjs (only autonomous scheduler)          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TSOS PLATFORM KERNEL (single syscall)                 │
│  kernelExecute / wrapBuild / wrapCouncilMember                           │
│  ├── authorize (policy, zone, halt)                                      │
│  ├── delegate (council, builder, OIL)                                    │
│  ├── receipts (token, build ledger, OIL, unmetered exception)            │
│  └── memory hooks (performance, lessons — evidence only)                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────────┐
│   BUILD DRIVER (one commit)   │    │   VERIFICATION DRIVERS            │
│   POST /builder/build only    │    │   OIL · precommit · 4-gate verify │
│   (no /execute public)        │    │   outcome verifier                │
└──────────────────────────────┘    └──────────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              COMPLETION AUTHORITY (single terminal writer)                 │
│  grantBuildCompletion() → completion_receipt_id                          │
│  FAIL_WRONG_OUTCOME · FAIL_INCOMPLETE_TECHNICAL · fail-closed              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    RUNTIME SPINE (one composition root)                    │
│  server.js → register-runtime-routes.js ONLY (+ boot-domains.js)         │
│  Neon · Railway managed-env · migration-runner · env-validator             │
└─────────────────────────────────────────────────────────────────────────┘

Parallel (fenced until cutover receipt):
  factory-staging/ — execute-step, BPB intake, historian (no production git)

Retired:
  two-tier auto-builder · shadow queue · public /execute · duplicate ROOT C/D mounts
```

### Consolidation milestones mapped to target

| Milestone | Delivers |
|-----------|----------|
| Three-root Phases 0–7 | Single mount truth |
| Execution retirement BE-1–BE-7 | Single commit actuator |
| Completion authority CA-0–CA-6 | Single terminal PASS |
| Blocker sequence S1–S7 | End-to-end build readiness |
| Factory FAC-6 cutover receipt | Explicit factory merge decision |

---

## 1-year outlook (2026-06 → 2027-06)

**Theme:** **Consolidate authority, prove one autonomous loop.**

| Quarter | Expected state |
|---------|----------------|
| **Q3 2026** | Three-root Phase 0–2 complete; shadow queue retired; auto-builder commit blocked; completion authority on all `/build` responses; DONE gate demoted to evidence |
| **Q4 2026** | Single canonical runner; CC jobs carry `required_outcome`; zone 1/2 live build acceptance green; Voice Rail founder usability pass |
| **Q1 2027** | ROOT B/C collapsed into ROOT A; old command-center bundle retired; mount truth CI enforced |
| **Q2 2027** | Product PASS requires `completion_receipt_id`; BP sync fail-closed; autonomous overnight runs complete ≥1 BP item per week with outcome proof |

**1-year success metric:** One documented path from founder instruction → `completion_receipt_id` → Railway deploy → product acceptance — **without** manual agent intervention, **zero** FAIL_OPEN commits.

**1-year realistic constraint:** Factory-staging remains **separate process**; full factory cutover is a founder decision, not assumed.

---

## 3-year outlook (2026-06 → 2029-06)

**Theme:** **Autonomous product factory with human sovereignty.**

| Year | Architecture |
|------|----------------|
| **Year 1** | Consolidated spine + single completion authority (above) |
| **Year 2** | Factory cutover **or** hardened adapter: mission packs → CC → `/build` only; Historian enforced on production; decision ledger live; CCL pilot for agent-to-agent packets |
| **Year 3** | Multi-product autonomous queue from BP_PRIORITY only; Voice Rail native + continuous founder loop; TSOS as **external efficiency product** unbundled from LifeOS core if revenue warrants; self-repair closed loop with prevention hooks |

**3-year org chart (software):**

- **LifeOS** — consumer OS (Voice Rail primary interface)  
- **BuilderOS** — internal programming machine (never user-facing commit buttons)  
- **TSOS** — metering, kernel, routing product (B2B or internal COGS optimizer)  
- **Factory runtime** — merged or tightly coupled via receipt contract  
- **Hist** — read/salvage only, automated archive  

---

## Biggest future risk

**Compound authority drift under autonomous load.**

If autonomous schedulers (overnight runner, Voice Rail commands, factory autopilot) scale **before** consolidation completes, the system will:

1. Commit via the **fastest** path (direct `/build`, legacy auto-builder, or shadow queue)  
2. Emit **PASS** from the **nearest** authority (acceptance script, DONE gate, ledger row)  
3. Mark BP items **complete** without outcome parity  
4. Train operators and agents that **green receipts are meaningless** — the exact failure mode that triggered §2.18 Compound Drift Law

**Second-order risk:** Three-root mount order causes **silent behavior change** when consolidation reorders registration — production "fixes" that break overlays without CI catching path regressions.

---

## Biggest future opportunity

**A provably trustworthy autonomous build loop on existing infra.**

The hard parts already exist in fragments:

- Providers connected (live 2026-06-14)  
- Governed loop with outcome verifier (SAFE path)  
- Voice Rail honest execution truth  
- Kernel wrap + token/OIL ledger design  
- BP priority as single queue SSOT  
- Pre-commit constitutional enforcement  

**Opportunity:** Completing consolidation unlocks **one receipt chain** (`completion_receipt_id`) that ties founder intent → git SHA → deploy → product PASS — enabling true overnight autonomy **without** trusting agent self-reporting.

Secondary opportunity: **TSOS as product** — token accounting, routing, and kernel already exceed typical "AI gateway" offerings; unbundling after LifeOS core stabilizes.

---

## Recommended end-state architecture (summary)

| Layer | End state |
|-------|-----------|
| **Composition** | `server.js` → `register-runtime-routes.js` + `boot-domains.js` |
| **Queue** | `BP_PRIORITY.json` only |
| **Orchestration** | Command-control only |
| **Execution** | `/builder/build` only (kernel-wrapped) |
| **Terminal success** | `builderos-completion-authority.js` only |
| **Measurement** | DONE gate → `evidence_only` input to completion authority |
| **Verification** | OIL + precommit + outcome verifier (delegates, not terminal) |
| **Interface** | Voice Rail → CC → governed loop |
| **Factory** | Fenced until cutover; then adapter to same completion contract |
| **Hist** | Archive/salvage; never product queue |

---

## External architect recommendations (priority)

| Priority | Action |
|----------|--------|
| P0 | Finish completion authority + DONE gate demotion before scaling autonomous runs |
| P0 | Retire shadow execution paths (queue, auto-builder, `/execute`) |
| P1 | Three-root consolidation Phases 0–4 |
| P1 | Wire measurement ledger before any terminal gate (blocker plan S3) |
| P2 | Mount truth CI + orphan route disposition |
| P2 | Product acceptance ↔ completion receipt linkage |
| P3 | Factory cutover decision (explicit receipt, not gradual bleed) |
| P3 | TSOS vocabulary alignment (NSSOT amendment if narrow TSOS adopted) |

---

## Input note

`docs/AUTHORITY_CONSOLIDATION_MASTER_AUDIT_V1.md` was **not found** in the repository at review time. This review used `PASS_DONE_AUTHORITY_AUDIT_V1.md` and `COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md` as authority-consolidation substitutes.

---

## Change receipt

| Date | File | What |
|------|------|------|
| 2026-06-14 | `docs/FUTURE_STATE_ARCHITECTURE_REVIEW_V1.md` | V1 external future-state architecture review for autonomous-operation readiness |
