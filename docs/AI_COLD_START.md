# AI Cold Start Packet

> **AUTO-GENERATED** — do not hand-edit. Regenerate: `npm run cold-start:gen`
> Generated: 2026-07-03T01:35:09.776Z

## Read order (mandatory)

1. `docs/AGENT_RULES.compact.md` — enforcement packet.
2. `prompts/00-HIST-LEGACY-BOUNDARY.md` — **STOP:** Hist vs active systems (do not skip).
3. `prompts/00-LIFEOS-AGENT-CONTRACT.md` — epistemic baseline (§2.6, §2.11, §2.15).
4. `prompts/00-SSOT-READ-SEQUENCE.md` — ordered SSOT reads (anti-drift).
5. `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md` — think vs execute model policy.
6. This file (you are reading it).
7. The lane log for your task (`CONTINUITY_LOG_LIFEOS.md` / `CONTINUITY_LOG_COUNCIL.md` / main log).
8. Owning manifest JSON (e.g. `AMENDMENT_21_LIFEOS_CORE.manifest.json`) for structured next steps.
9. `prompts/<domain>.md` when using the builder.

## Program priority — LifeOS (KNOW)

**Operator directive (2026-05-03 — supersedes conflicting text below until Article VII amends this):** Adam declares **LifeOS shipped + stabilized + approved backlog features working** as **program priority one**. Agents shall **execute** the LifeOS build plan ( **`LIFEOS_DASHBOARD_BUILDER_QUEUE.json`**, overlay/API routes, verifiers, SSOT receipts) and **not** idle LifeOS solely because of the historical revenue-chain ordering in the next paragraph. Revenue lanes remain important; **this directive is explicit portfolio reordering** (North Star **§2.15** — clear operator instruction).

**In practice:** execution is `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`, LifeOS routes/overlays in **Amendment 21** scope, and honest **Change Receipts**. **No** scope outside the approved backlog without Adam or a load-bearing **§2.12** path (`run-council` / gate-change on the running app). Full legal text: `docs/products/lifeos/PRODUCT_HOME.md` → **Approved Product Backlog** → **PRIORITY ALIGNMENT**.

## CONTINUITY_INDEX.md

<!-- SYNOPSIS: Continuity Index -->

# Continuity Index

**Purpose:** Parallel workstreams no longer share one monolithic `CONTINUITY_LOG.md`. Each lane has its own log so the next agent reads only what matters for that lane.

**Cold-start (any agent):** Read `docs/AI_COLD_START.md` (regenerate with `npm run cold-start:gen`), then open the lane for your task.

**Repo-wide file inventory (cleanup / “what is this?”):** `docs/REPO_CATALOG.md` — regenerate with `npm run repo:catalog`. **Compact bucket stats:** `docs/REPO_BUCKET_INDEX.md`. **Every index in one place:** `docs/REPO_MASTER_INDEX.md`. Human triage: `docs/REPO_TRIAGE_NOTES.md`. **Spine vs experimental trees:** `docs/REPO_DEEP_AUDIT.md`.

| Lane ID | File | Scope |
|--------|------|--------|
| `general` | `docs/CONTINUITY_LOG.md` | Cross-cutting session summaries, repo-wide decisions, legacy history |
| `council` | `docs/CONTINUITY_LOG_COUNCIL.md` | AI Council, LCL, token stack, builder dispatch, model routing |
| `lifeos` | `docs/CONTINUITY_LOG_LIFEOS.md` | LifeOS Core SSOT (Amendment 21), overlays, LifeOS routes/services |
| `tc` | `docs/CONTINUITY_LOG_TC.md` | TC service lane (Amendment 17), TC routes/services/migrations |
| `horizon` | `docs/CONTINUITY_LOG_HORIZON.md` | Competitive + AI landscape intel (`/api/v1/lifeos/intel/horizon/*`, Amendment 36) |
| `security` | `docs/CONTINUITY_LOG_SECURITY.md` | Red-team / dependency + future pentest scope (`/api/v1/lifeos/intel/redteam/*`, Amendment 36) |

**Session tag prefix (required on every new entry):** `[PLAN]` `[BUILD]` `[FIX]` `[REVIEW]` `[RESEARCH]`

Example first line of an update:

`## [BUILD] Update 2026-04-19 #1`

**SSOT:** `docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md`


## Snippet — main CONTINUITY_LOG (first update block)

## [SESSION] 2026-07-02 (cont. 3) — ARC entry-gate merged (#181) + next-layer cascade diagnosed + host portability

Adam: *do it right (repair ARC), drive only via the founder UI chat, find every issue; also — infra: Cloudflare front-door + keep BOTH Railway & Render swappable; and be cost-wise as heavy AI users while bootstrapping.* **ARC entry-gate unblocked and MERGED:** PR #181 (reconstructed `scripts/validate-intent-tier1.mjs`, the intake-loop IL-S05 script that was never authored) self-merged to `main` via the system's own `GITHUB_TOKEN` (CI 14/14). Verified in-pipeline: `runArcPipeline('FACTORY-LUMIN-FOUNDER-ALPHA-GAPFILL-0001')` now returns `entry.ok=true / ARC_ENTRY_PASS` (0 violations). **Next-layer ARC cascade diagnosed (not yet fixed):** the same pipeline still returns `clear_to_build=no` — simulate reports **69 blocking gaps** across 7 steps, in two classes: (1) the stored `BLUEPRINT.json` is the **stale council-authored** version whose steps lack the executable contract (`action_type`,`sandbox_boundary`,`authority_owner`,`on_block`) — and that mission has **no registered compiler** (`compile-blueprint.js` only wires `BUILDEROS-INTAKE-LOOP-V1-0001` exact + `PRODUCT-*`→`product-blueprint-host`), so its blueprint was never compiled to frozen contracts; (2) "monorepo legacy quarantine" on spine targets — but this is **satisfiable**: `blueprint-write-policy.mjs`→`shouldBlockLegacyWrite` allows spine writes when the step IS a frozen `write_file_exact` (byte_exact_copy sha256 + matching sandbox), exactly what `product-blueprint-host` emits. **So the clean governed end-to-end proof is a greenfield `PRODUCT-*` mission** (files exist → product-host compiler snapshots them → frozen steps pass simulate + quarantine → build), NOT grinding the deprioritized LifeOS gapfill mission. **Cost finding:** `config/runtime-env.js` already exposes `MAX_DAILY_SPEND` (default `0`) + `COST_SHUTDOWN_THRESHOLD` — a real spend cap already exists to build the Cost Engine on. **Infra portability:** added `render.yaml` (host-agnostic twin of the Railway service; secrets stay in dashboard) so the same commit deploys on Render as a warm alternate behind the planned Cloudflare front-door. Site still Railway-flaky (US-region edge incident + per-service wedge); watchdog holding. **Next:** author greenfield `PRODUCT-*` mission to prove one supervised governed build end-to-end; then wrap in guarded loop; Cloudflare+Render migration needs a domain + secrets from Adam.

## [SESSION] 2026-07-02 (cont. 3b) — System merged PR #177; permanent fix live; autonomy un-paused (honest gap flagged)

Adam: *well can i have my system push it and merge* — a capability test, not a request for me to merge. **The system did it:** PR #177 was merged to `main` using the system's own `GITHUB_TOKEN` (merge commit `85f542cc`). **Deploy proven in prod:** fresh Railway build from `main` went ACTIVE/healthy — production runs the permanent Dockerfile shell-exec + dual-stack fix. **Autonomy:** set `PAUSE_AUTONOMY=0` on `lumin-web`. **HONEST GAP:** un-pausing does not start a self-driving loop on the founder runtime — schedulers/workflows still point at unmounted legacy routes; builder only runs on explicit `/api/v1/lifeos/builder/build`. **Next:** guarded always-on loop on a branch after Adam go-ahead.

---

## [SESSION] 2026-07-02 — Live deploy restored + autonomous self-build loop hardened (PR #177)

Adam: *keep going all night long and finish this out — use the system as your hands; the 

## Snippet — LifeOS lane

## [BUILD] Update 2026-06-27 — Founder continue-to-Point-B routing hardening

### What happened
- **The next founder-path bug appeared right after status authority was fixed live.** `continue building toward point b until pass or exact blocker` still routed to `mission_pipeline` and returned receipt-scan/foundation-pipeline failure instead of staying in the Point B execution lane.
- **Root cause was classifier priority.** `chair-context-classifier.js` was still returning `mission_pipeline` before giving high-confidence Point B system asks a chance to stay in the Point B navigator lane.
- **Fix shipped locally.** High-confidence Point B system routing now wins before the generic `mission_pipeline` branch, and the exact founder phrasing is locked by regression.

### Verification
- `node --test tests/chair-context-classifier.test.js tests/point-b-navigator.test.js tests/lumin-conversation-routing.test.js tests/lumin-chair-orchestrator.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/chair-program-direct-answer.test.js`

### Next
Deploy this classifier fix, rerun the live founder continue-to-Point-B probe, then continue walking the founder UI path until the next autonomy blocker is concrete.

## [BUILD] Update 2026-06-27 — Founder continuation-language hardening + LifeRE truth-split audit

### What happened
- **Two founder-language defects remained after Point B routing was repaired.** Natural continuation shorthand like `keep going until pass or exact blocker` still fell into display/counsel, and explicit `run execute mission for PRODUCT-LIFERE-OS-V1-0001` was being classified as generic blueprint execution and blocked by Founder Packet ambiguity instead of entering the governed Point B mission loop.
- **Routing is now tightened around actual founder phrasing.** `services/lumin-conversation-routing.js` keeps continue-to-pass language out of display-only routing, and `services/chair-context-classifier.js` now routes those shorthand continuation asks plus explicit product mission execution into the Point B lane.
- **A real truth split was also surfaced, not fixed over.** Local mission artifacts for `PRODUCT-LIFERE-OS-V1-0001` currently show acceptance `PASS` and `BUILDER_RUN_RECEIPT.verdict = TECHNICAL_PASS`, while the live founder endpoint still reports `machine:acceptance FAIL — result truth wins over corridor pass`. That contradiction is now explicitly recorded as unresolved.

### Verification
- `node --test tests/lumin-conversation-routing.test.js tests/chair-context-classifier.test.js tests/point-b-navigator.test.js tests/lumin-chair-orchestrator.test.js`
- `node --test tests/chair-direct-connection-truth.test.js tests/chair-program-direct-answer.test.js`
- Live founder probe (current deploy `66ad2bd0939d2931570de2aa91ef9f0f63758a8d`):
  - `continue building toward point b until pass or exact blocker` → `point_b`, `RUNNING`, `execute_mission`
  - `keep going until pass or exact blocker` → wrong on live before this patch (`display` / `NO_COMMAND_RAN`)
  - `run execute mission for PRODUCT-LIFERE-OS-V1-0001` → wrong on live before this patch (`blueprint_execute` → FPv2 ambiguity block)

### Next
Deploy the continuation-language fix, rerun the founder continuation battery on Railway, then trace whether the live Point B gate is reading stale acceptance receipts or stale runtime files.

## [BUILD] Update 2026-06-27 — Point B Alpha truth-gate repair

### What happened
- **The continuation deploy resolved the original r

## Snippet — Council lane

## [BUILD] Update 2026-04-26 #2 — Runtime authority + future-back consensus enforcement

### Files changed
- `routes/lifeos-council-builder-routes.js` — builder dispatch now consults Memory Intelligence routing, fails closed when no authorized model is allowed, and records protocol violations on unverifiable output.
- `routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-council-run.js`, `prompts/lifeos-gate-change-proposal.md` — gate-change debate now requires future-back analysis, filters blocked models, and persists debate artifacts into memory.
- `config/task-model-routing.js` — static routing is now preference only; candidate-model ordering exported for runtime authority filtering.
- `services/memory-intelligence-service.js`, `routes/memory-intelligence-routes.js`, `db/migrations/20260426_memory_intelligence_hardening.sql`, `db/migrations/20260426_memory_protocol_enforcement.sql` — protocol violations, task authority, routing recommendation, debate future-lookback.
- `docs/products/ai-council/PRODUCT_HOME.md`, `docs/SSOT_COMPANION.md`, `docs/AGENT_RULES.compact.md`, `scripts/generate-agent-rules.mjs` — council law, anti-corner-cutting rule, and compact cold-start packet updated; generator now keeps the rule durable.

### State after this session
- Builder, gate-change, and Lumin plan/draft lanes can now reject blocked models at runtime instead of blindly trusting static routing.
- Future-back is part of the required council protocol and is persisted with debate records.
- Compact agent rules are regenerated from script and still satisfy the token-budget law; manual edits to `AGENT_RULES.compact.md` are no longer the only source.

### Next agent (council lane): start here
1. Wire council/builder success + failure receipts into `fact_evidence` automatically so routing and authority are fed by real verifier outcomes, not just manual writes.
2. Add targeted tests for `recordProtocolViolation()` + routing recommendation selection.
3. Extend runtime authority checks to any remaining council entrypoints that still call providers directly.

---

## [BUILD] Update 2026-04-19 #1 — LCL + builder surface (migrated from main log #5)

### Files changed (canonical list — see also main `CONTINUITY_LOG.md` history)
- `config/codebook-v1.js`, `services/prompt-translator.js`, `services/lcl-monitor.js`, `db/migrations/20260419_lcl_quality_log.sql`, `services/council-service.js`, `routes/lifeos-council-builder-routes.js`, `startup/register-runtime-routes.js`, `server.js`, `docs/products/ai-council/PRODUCT_HOME.md`

### State after that session
- LCL Layer 1.5 live on `callCouncilMember`; drift monitor with per-(member, taskType) rollback.
- `GET /api/v1/lifeos/builder/lcl-stats` live.

### Next agent (council lane): start here
1. Confirm `db/migrations/20260419_lcl_quality_log.sql` applied on Neon (auto on deploy).
2. Fix gaps documented in `AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` → Approved backlog (Ollama `inspect`, static codebook import — may already be shipped in a later commit).
3. Conflict interrupt + Lumin reactions remain **LifeOS lane** (`CONTINUITY_LOG_LIFEOS.md` + `prompts/lifeos-conflict.md`).

---


## Amendment 36 (Zero-Drift) — abstract

<!-- SYNOPSIS: Canonical product home — ZERO DRIFT HANDOFF PROTOCOL -->

# ZERO DRIFT HANDOFF PROTOCOL Product Home

**Formerly called:** Amendment 36 — ZERO DRIFT HANDOFF PROTOCOL

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `zero-drift-handoff-protocol` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/zero-drift-handoff-protocol/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-06-29 |

---
| Field | Value |
|-------|--------|
| **Lifecycle** | `infrastructure` |
| **Reversibility** | `two-way-door` |
| **Stability** | `operational` |
| **Last Updated** | 2026-06-30 — readiness and handoff references now point at canonical product-home governance files instead of root-level amendment-era checklist paths; legacy `docs/projects/*` authority docs are archived under `docs/history/legacy-history-salvage/docs-projects-root/`. Prior: **NSSOT §2.10 ¶8–10** (audit epistemic format, improvement-idea council rule, truth-first order — constitutional clarification, no existing law changed). Prior: **OF1 + QP1 + LA1** — operator freshness fail-closed (`scripts/operator-runtime-status.mjs`, `scripts/generate-operator-dashboard-json.mjs`, `tests/operator-runtime-status-freshness.test.js`, `package.json` test list); LifeOS product queue split (`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json` code-only, docs/spec backlog in `LIFEOS_DOCS_QUEUE.json`); lane accountability hardening (`scripts/lifeos-builder-continuous-queue.mjs`, `scripts/tsos-builder-auditor.mjs`, `scripts/operator-stale-failure-detect.mjs`, RL1/RL2 lane scoping) plus quarantine normalization so Nova no longer inherits TC / Site Builder rows. Prior: **SF1** — **`npm run operator:stale-failure-detect`** → **`scripts/operator-stale-failure-detect.mjs`**; **`data/operator-stale-failure-log.jsonl`**; **`docs/OPERATOR_DASHBOARD_JSON.md`** § **2f**; **`package.json`**; **`.gitignore`** — Prior: **RL2** — **`npm run operator:repair-loop:r2`** → **`scripts/operator-repair-loop-r2-once.mjs`**; **`tests/tc-morning-digest-service-module.test.js`**; **`docs/OPERATOR_DASHBOARD_JSON.md`** § **2e**; **`docs/products/tc-service/PRODUCT_HOME.md`**; **`package.json`** — Prior: **RL1 + RL1-test-verify** — **`npm run operator:repair-loop`** → **`scripts/operator-repair-loop-once.mjs`**; **`services/site-builder-postmark-helper.js`** + **`tests/site-builder-po

## Institutional Memory — top lessons from lessons_learned

> Source: `docs/INSTITUTIONAL_MEMORY_DIGEST.md` — generated from `lessons_learned` DB table.
> Confidence: low-to-medium. Do not treat as INVARIANT without runtime evidence.

## agent-workflow

### MEDIUM: Local repo was 32 commits behind origin/main during a governance session; operat...

**Problem:** Local repo was 32 commits behind origin/main during a governance session; operator:status showed stale snapshot as if current. 13 files existed on disk untracked — never committed, invisible to Railway.

**Solution:** Run `git pull --rebase origin main` at session start when autonomous builders are active. Check git status for untracked files that belong to the system. OF1 freshness check in operator-runtime-status.mjs now flags stale snapshots as STALE/FAIL_CLOSED.

**How novel:** known but hard  
**Source:** AM36 receipt 2026-05-13 — GOVERNANCE_LOCK c60e1c64; 13 untracked files  
**Tags:** operator-status, stale-snapshot, git-sync, recovery, confidence:medium

---

### SMALL: Railway autonomous builders push commits continuously during human sessions; loc...

**Problem:** Railway autonomous builders push commits continuously during human sessions; local branches diverge within minutes. Non-fast-forward push failures occur on nearly every human-session push.

**Solution:** `git fetch origin && git rebase origin/main` immediately before every push attempt. May need multiple rounds if builders push between rebase and push. Do not use git merge — rebase preserves linear history expected by the build system.

**How novel:** standard  
**Source:** CONTINUITY_LOG 2026-05-13/14 — push failures, C21 proof  
**Tags:** git, rebase, railway-autonomy, push, confidence:medium

---

## autonomy

### LARGE: Forge daemon retried a file that was already valid on disk across circuit-breake...

**Problem:** Forge daemon retried a file that was already valid on disk across circuit-breaker cycles — no mechanism to detect the file existed. Truncation loop: builder produces 7 lines → circuit breaker → 2h pause → retry → repeat.

**Solution:** SIS1: pre-builder disk check — if .js target_file exists + line count ≥ 10 + node --check passes → log task_skip_already_shipped and continue without an HTTP builder call. Confirmed live: multiple tasks skipped in site-builder-autonomous-queue.

**How novel:** first known solution  
**Source:** AM36 receipt 2026-05-12 — SIS1; checkIfAlreadyShipped()  
**Tags:** sis1, forge, circuit-breaker, builder, skip-if-shipped, confidence:medium

---

### MEDIUM: A write-lock with no expiry silently routes all autonomous commits to staging in...

**Problem:** A write-lock with no expiry silently routes all autonomous commits to staging indefinitely if the operator forgets to release it.

**Solution:** acquireLock() writes expires_at + ttl_minutes; readLock() auto-deletes expired file and returns null. Default TTL: 120 minutes via AUTONOMY_LOCK_TTL_MINUTES env.

**How novel:** first known solution  
**Source:** Adam directive 2026-05-14; AM36 C21 receipt  
**Tags:** c21, autonomy-write-lock, expiry, ttl, confidence:medium

---

### MEDIUM: data/builder-failure-patterns.json lives on Railway ephemeral filesystem

## Task DNA coverage (S4 — warn-only)

> Fields: why_created, source_receipt, depends_on, blocks, proof_required_to_close
> Missing DNA does not block execution. This section is informational only.

[task-dna] S4 Task DNA v0 — field coverage report

  LIFEOS_DASHBOARD_BUILDER_QUEUE: 28 tasks | 1 with DNA (4%) | 27 missing
    → next DNA task: lifeos-alpha-consensus-pack
       present: why_created, source_receipt, depends_on, blocks, proof_required_to_close
  SITE_BUILDER_AUTONOMOUS_QUEUE: 11 tasks | 0 with DNA (0%) | 11 missing
  TC_SERVICE_BUILDER_QUEUE: 5 tasks | 0 with DNA (0%) | 5 missing

  TOTAL: 44 tasks | 1 with DNA (2%) | 43 missing
  (warn-only — missing DNA does not block queue execution)

## Prediction loop (S5 — warn-only)

> Source: `data/prediction-loop.jsonl` — written by queue at each task exit.
> Mismatches are informational only and do not block queue execution.

[prediction-loop] No prediction records yet — data/prediction-loop.jsonl not found.
  (warn-only)


## Amendment 21 — Agent Handoff Notes region

## Agent Handoff Notes` section at the bottom of `## Approved Product Backlog`
2. Read the last 3–5 rows of `## Change Receipts` at the bottom of this file
3. Read `docs/CONTINUITY_INDEX.md` + the correct lane log + `docs/CONTINUITY_LOG.md` for cross-cutting history
4. Check that what the SSOT says matches what is actually in the codebase — if it doesn't, fix the SSOT

**Your job after every file you write or edit:**
- Update `## Change Receipts` with: what changed, why, what it does, any known issues
- Update `## Agent Handoff Notes` with the current state and next priority
- Update `docs/CONTINUITY_LOG.md` with a one-paragraph summary

**Append-only SSOT history (NON-NEGOTIABLE):** Do **not** delete, bulk-rewrite, or erase prior **`## Change Receipts`** table rows or continuity log entries to “clean history.” Corrections belong in a **new** receipt row or log update that cites what was wrong and what supersedes it. Git history remains the reversible audit trail; soften **meaning** of past law text only via North Star Amendment **Article VII** path — never pretend past commitments did not exist.

**The standard is: painstakingly accurate, embarrassingly detailed, written for someone with zero memory of this project.**

If you were cut off mid-task, find your last `## Change Receipts` entry and look for `⚠️ IN PROGRESS:` markers.

---

## Adam ↔ Agent epistemic contract (NON-NEGOTIABLE)

**Supreme law:** This section **implements** `docs/constitution/NORTH_STAR_SSOT.md` → **Article II §2.6 System Epistemic Oath**, **Article II §2.10**, **Article II §2.11 (code the system / gaps; the system programs amendments & projects; `GAP-FILL` on the platform only)**, **Article II §2.11c (Conductor as supervisor — system codes at scale; audit, debate, report; not default IDE product authorship)**, **Article II §2.12 (technical decisions → AI Council + best-practice research; consensus / full debate if split; Conductor/Construction supervisor SSOT re-read and drift detection; non-derogable)**, **Article II §2.14 (TSOS machine-channel lexicon: `docs/TSOS_SYSTEM_LANGUAGE.md` — machinery only; not §2.11b)**, **Article II §2.15 (operator instruction supremacy; anti-steering; honest limits of paper law on external LLMs)**, and **Article II §2.17 (operator mandate completion bar — proof receipt or UNSOLVED; no smart substitution)** for the LifeOS lane and Adam-facing agents. It may add detail; it may **not** weaken §2.6, §2.10, §2.11, **§2.11c**, **§2.12**, **§2.14**, **§2.1

## Institutional Memory — top lessons (RECEIPT-class, not FACT)

> Source: `docs/INSTITUTIONAL_MEMORY_DIGEST.md` — generated from `lessons_learned` DB table.
> Confidence: low-to-medium. Do not treat as INVARIANT without runtime evidence.

## agent-workflow

### MEDIUM: Local repo was 32 commits behind origin/main during a governance session; operat...

**Problem:** Local repo was 32 commits behind origin/main during a governance session; operator:status showed stale snapshot as if current. 13 files existed on disk untracked — never committed, invisible to Railway.

**Solution:** Run `git pull --rebase origin main` at session start when autonomous builders are active. Check git status for untracked files that belong to the system. OF1 freshness check in operator-runtime-status.mjs now flags stale snapshots as STALE/FAIL_CLOSED.

**How novel:** known but hard  
**Source:** AM36 receipt 2026-05-13 — GOVERNANCE_LOCK c60e1c64; 13 untracked files  
**Tags:** operator-status, stale-snapshot, git-sync, recovery, confidence:medium

---

### SMALL: Railway autonomous builders push commits continuously during human sessions; loc...

**Problem:** Railway autonomous builders push commits continuously during human sessions; local branches diverge within minutes. Non-fast-forward push failures occur on nearly every human-session push.

**Solution:** `git fetch origin && git rebase origin/main` immediately before every push attempt. May need multiple rounds if builders push between rebase and push. Do not use git merge — rebase preserves linear history expected by the build system.

**How novel:** standard  
**Source:** CONTINUITY_LOG 2026-05-13/14 — push failures, C21 proof  
**Tags:** git, rebase, railway-autonomy, push, confidence:medium

---

## autonomy

### LARGE: Forge daemon retried a file that was already valid on disk across circuit-breake...

**Problem:** Forge daemon retried a file that was already valid on disk across circuit-breaker cycles — no mechanism to detect the file existed. Truncation loop: builder produces 7 lines → circuit breaker → 2h pause → retry → repeat.

**Solution:** SIS1: pre-builder disk check — if .js target_file exists + line count ≥ 10 + node --check passes → log task_skip_already_shipped and continue without an HTTP builder call. Confirmed live: multiple tasks skipped in site-builder-autonomous-queue.

**How novel:** first known solution  
**Source:** AM36 receipt 2026-05-12 — SIS1; checkIfAlreadyShipped()  
**Tags:** sis1, forge, circuit-breaker, builder, skip-if-shipped, confidence:medium

---

### MEDIUM: A write-lock with no expiry silently routes all autonomous commits to staging in...

**Problem:** A write-lock with no expiry silently routes all autonomous commits to staging indefinitely if the operator forgets to release it.

**Solution:** acquireLock() writes expires_at + ttl_minutes; readLock() auto-deletes expired file and returns null. Default TTL: 120 minutes via AUTONOMY_LOCK_TTL_MINUTES env.

**How novel:** first known solution  
**Source:** Adam directive 2026-05-14; AM36 C21 receipt  
**Tags:** c21, autonomy-write-lock, expiry, ttl, confidence:medium

---

### MEDIUM: data/builder-failure-patterns.json lives on Railway ephemeral filesystem

## Task DNA coverage (S4 — warn-only)

> Fields: why_created, source_receipt, depends_on, blocks, proof_required_to_close
> Missing DNA does not block execution. This section is informational only.

[task-dna] S4 Task DNA v0 — field coverage report

  LIFEOS_DASHBOARD_BUILDER_QUEUE: 28 tasks | 1 with DNA (4%) | 27 missing
    → next DNA task: lifeos-alpha-consensus-pack
       present: why_created, source_receipt, depends_on, blocks, proof_required_to_close
  SITE_BUILDER_AUTONOMOUS_QUEUE: 11 tasks | 0 with DNA (0%) | 11 missing
  TC_SERVICE_BUILDER_QUEUE: 5 tasks | 0 with DNA (0%) | 5 missing

  TOTAL: 44 tasks | 1 with DNA (2%) | 43 missing
  (warn-only — missing DNA does not block queue execution)

## Prediction loop (S5 — warn-only)

> Source: `data/prediction-loop.jsonl` — written by queue at each task exit.
> Mismatches are informational only and do not block queue execution.

[prediction-loop] No prediction records yet — data/prediction-loop.jsonl not found.
  (warn-only)
