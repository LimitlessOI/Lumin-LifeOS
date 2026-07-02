# AI Cold Start Packet

> **AUTO-GENERATED** — do not hand-edit. Regenerate: `npm run cold-start:gen`
> Generated: 2026-07-02T07:19:04.988Z

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

## [SESSION] 2026-06-29 — Repo + Neon organization pass (files + database cleanup)

Adam: *go deeper — fix our files, organize them, organize Neon (useless crap).* **Files:** BuilderOS docs consolidated under `docs/products/builderos/` — `TWIN.md`, `specs/BP_V1.md`; alpha blueprint archived to `docs/history/builderos/`; redirect stubs left at old paths; **1,108** `@ssot`/path references updated to canonical product home. **Neon:** Created `archive` schema; moved **49** tables out of `public` (29 empty prototypes + 20 legacy orphan-data tables including `task_outputs` 68k rows, `compression_stats` 54k rows). **Result:** `public` **509 → 460** tables; **88** with live data; **372** empty schema-ready (code-referenced, kept); **0** orphan/review left. Audit script: `scripts/neon-schema-audit.mjs`; guide: `docs/database/README.md`. **Not done:** LifeOS 2k-line PRODUCT_HOME trim; `docs/projects/` dashboard spec sprawl; 372 empty schema-ready tables (wait until products ship or Adam approves deeper cut). **Next:** commit when Adam asks; optional LifeOS spec folder migration.

---

## [SESSION] 2026-06-27 — Founder overlay auth redirect v1 was still split-brain; callers still built nested `next=`

Adam: *run a live ui run and repair and observe; do not stop.* After the first redirect hardening pass was committed and pushed, Railway was verified on the new SHA and the anonymous `/overlay/lifeos-app.html?direct_system=1` probe was rerun. That probe still failed live even though the bootstrap helper code was updated: the login URL was now a single `next` param, but its value still contained a nested `?next=`. That proved the remaining problem was architectural, not deployment lag. The helper had been fixed, but the overlay shell and ambient listener were still hand-building `/overlay/lifeos-login.html?next=...` and then delegating to a helper that also owns redirect construction. **Fixed locally:** `public/overlay/lifeos-app.html` and `public/shared/lifeos-ambient-listener.js` now call `requireAuth('/overlay/lifeos-login.html')` only, leaving `lifeos-bootstrap.js` as the single source of truth for `next` generation. **Next:** commit this second redirect slice, redeploy Railway, rerun the anonymous overlay probe until the login URL is clean, then continue founder-path break testing.

## [SESSION] 2026-06-27 — Founder overlay shell auth redirect was false-green; live probe caught nested `next=`

Adam: *run a live ui run and repair and observe; keep it going and have it fix its issues you find.* The live founder loop was re-run against Railway, not just local code. First fix shipped: founder `/api/v1/lifeos/auth/me` now supports direct founder command-key mode and the real-app E2E token minting now matches runtime millisecond auth. That cleaned the noisy console/auth path and restored the live real-app E2E to green. Then the probe was tightened: a second anonymous check now opens `/overlay/lifeos-app.html?direct_system=1` directly and verifies the login redirect shape. That immediately exposed a real client-side auth bug the old tests missed: the overlay shell was building `/overlay/lifeos-login.html?next=... ?next=...` by appending `next` twice. **Fixed locally:** `public/overlay/lifeos-bootstrap.js` now preserves a caller-supplied `next` instead of blindly appending another, and the live E2E now carries both server-gate and overlay-shell redirect probes so this cannot go false-green again. **Next:** commit only this redirect fix + new probe, push 

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
