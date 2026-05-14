# AI Cold Start Packet

> **AUTO-GENERATED** — do not hand-edit. Regenerate: `npm run cold-start:gen`
> Generated: 2026-05-14T02:02:51.732Z

## Read order (mandatory)

1. `docs/CONTINUITY_INDEX.md` — pick your lane.
2. `prompts/00-LIFEOS-AGENT-CONTRACT.md` — epistemic baseline (§2.6, §2.11, §2.15).
3. `prompts/00-SSOT-READ-SEQUENCE.md` — ordered SSOT reads (anti-drift).
4. `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md` — think vs execute model policy.
5. This file (you are reading it).
6. The lane log for your task (`CONTINUITY_LOG_LIFEOS.md` / `CONTINUITY_LOG_COUNCIL.md` / main log).
7. Owning manifest JSON (e.g. `AMENDMENT_21_LIFEOS_CORE.manifest.json`) for structured next steps.
8. `prompts/<domain>.md` when using the builder.

## Program priority — LifeOS (KNOW)

**Operator directive (2026-05-03 — supersedes conflicting text below until Article VII amends this):** Adam declares **LifeOS shipped + stabilized + approved backlog features working** as **program priority one**. Agents shall **execute** the LifeOS build plan ( **`LIFEOS_DASHBOARD_BUILDER_QUEUE.json`**, overlay/API routes, verifiers, SSOT receipts) and **not** idle LifeOS solely because of the historical revenue-chain ordering in the next paragraph. Revenue lanes remain important; **this directive is explicit portfolio reordering** (North Star **§2.15** — clear operator instruction).

**In practice:** execution is `docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`, LifeOS routes/overlays in **Amendment 21** scope, and honest **Change Receipts**. **No** scope outside the approved backlog without Adam or a load-bearing **§2.12** path (`run-council` / gate-change on the running app). Full legal text: `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` → **Approved Product Backlog** → **PRIORITY ALIGNMENT**.

## CONTINUITY_INDEX.md

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

**SSOT:** `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md`


## Snippet — main CONTINUITY_LOG (first update block)

## ⚠️ AGENT CONTINUITY PROTOCOL

**Adam hits usage limits frequently. Every session, a new agent starts cold with no memory.**

**Before writing a single line of code:**
1. Read `docs/CONTINUITY_INDEX.md` — pick the correct **lane log** (`CONTINUITY_LOG_COUNCIL.md`, `CONTINUITY_LOG_LIFEOS.md`, or this file for cross-cutting work).
2. Read `docs/AI_COLD_START.md` (run `npm run cold-start:gen` locally if missing or stale).
3. Read the most recent `## Update` in the lane you own (here: general/cross-lane history — **most recent first**).
4. Read `AMENDMENT_21_LIFEOS_CORE.md → ## Agent Handoff Notes` for LifeOS build state.
5. Read `AMENDMENT_21_LIFEOS_CORE.md → ## Approved Product Backlog` (including **PRIORITY ALIGNMENT** / operator directive) for LifeOS program order — **not** stale “revenue-only” excerpts elsewhere without re-checking that block.

**After every file you change:**
- Add a new update entry at the **top** of the appropriate lane file **and** a one-line pointer here if the change is cross-cutting.
- Prefix every new update title with a session tag: `[PLAN]` `[BUILD]` `[FIX]` `[REVIEW]` `[RESEARCH]` (example: `## [BUILD] Update 2026-04-19 #6`).
- Update `AMENDMENT_21_LIFEOS_CORE.md → ## Change Receipts` and `## Agent Handoff Notes` when LifeOS files changed.
- Be painstakingly accurate. Write for someone who has never seen this project.

**Update format:**
```
## [TAG] Update YYYY-MM-DD #N
### Files changed
- file.js — what changed, why, any known issues or incomplete stubs
### State after this session
- What works, what is broken, what is wired but untested
### Next agent: start here
- The very next task, specific enough to begin without asking
```

---

## [BUILD] Update 2026-05-14 #16 — S3/C09 Build Closure Contract

### Files changed
- `scripts/lib/closure-contract.mjs` — NEW. Pure function `buildClosureRecord()` + `validateClosureRecord()`. Three legal closure types: `committed_success`, `skipped_already_valid`, `explicit_noncommit_reason`. Each validates proof structure and throws on contract violation.
- `scripts/lifeos-builder-continuous-queue.mjs` — Wired C09 at 6 exit points: SIS1 skip, FPM1 level-3 quarantine, syntax/413 quarantine, hard fail, exception throw, build ok. Every task exit now emits `closure_contract_result` event.
- `tests/closure-contract.test.js` — NEW. 14 tests: all closure types, all violation paths, synthetic proof event round-trip.
- `package.json` — Added test to suite.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — Receipt + handoff updated.
- `docs/CONTINUITY_LOG.md` — This entry.

### State after this session
- `closure_contract_result` event emitted at every task exit point in the queue ✅
- `buildClosureRecord()` throws on contract violation — cannot produce malformed records
- `npm test`: 28 pass, 0 fail, 4 skipped (+14 from C09). `node --check`: PASS all files.
- Synthetic proof event: `closure_type:committed_success, ok_to_advance:true, proof.synthetic:true` confirmed in test output.
- No task advances without a typed, structured proof record in the JSONL log.

### Next agent: start here
- **S4 — Task DNA v0** (per Phase 2 agreed sequence). Adam to confirm scope before starting.
- C09 logs are JSONL — a future Sentinel can scan for tasks missing `closure_contract_result` events. That audit tooling is S4+ work.

---

## [BUILD] Update 2026-05-14 #15 — S2 Memory Bootstrap: lessons_learned seeded + reader wired

### Files changed
- `scripts/seed-lessons-learned.mjs` — NEW.

## Snippet — LifeOS lane

## [BUILD] Update 2026-05-13 — OVERNIGHT GOVERNANCE Cycle 4

### What happened
- **SIS1 mechanism confirmed.** `task_skip_already_shipped` events found in the queue log (not daemon log). Cycle 180 fired at 03:07:20 UTC on `site-builder-pipeline-report-route`; cycle 181 fired at 03:52:22 UTC on `site-builder-discovery-run-action`. Forge cursor now at pos 0 = `site-builder-postmark-send`. SIS1 is operating correctly — one more cycle (~04:37 UTC) will confirm the original RL1 target task specifically.
- **`tc-webhook-validator.js` audited: complete, not a stub.** 34 lines, both `validatePostmark` (HMAC-SHA256) and `validateTwilio` (HMAC-SHA1) fully implemented with timing-safe compare, graceful unconfigured-key skip. Clean `node --check`. No rebuild.
- **package.json guard regression test shipped.** `tests/deployment-service-package-guard.test.js` — 6 tests, all pass. Guard now self-protecting: file added to `REQUIRED_TEST_FILES` in `deployment-service.js` and to `package.json` test script.

### Verification
- `npm test`: **14 pass, 0 fail, 4 skipped** (4 smoke tests require live server)
- All 6 guard contract tests pass
- `node --check services/tc-webhook-validator.js`: PASS
- `node --check services/deployment-service.js`: PASS

### Next step
Watch for `task_skip_already_shipped site-builder-postmark-send` in `data/builder-continuous-queue-log.site-builder-autonomous-queue.jsonl`. When it appears, mark SIS1 fully confirmed and clear the PENDING_CONFIRMATION row in AM36 receipts. Then roadmap slice.

---

## [BUILD] Update 2026-05-13 — OVERNIGHT GOVERNANCE Cycle 3

### What happened
- **Test script stripped again** after pulling 3 new Railway commits. Fixed in `0071d8cd`. This has now happened 3+ times — root cause is Railway builder templates generating a 2-file test script.
- **package.json protected-scripts guard shipped** (`d1c72926`). Added content-aware check to `commitToGitHub` in `services/deployment-service.js`. Any commit to `package.json` that removes `repo:sync-check`, `lifeos:verify:ui-map`, or the 3 regression test files is rejected with a descriptive error. PROVISIONAL — monitored.
- **TC Stripe service rebuilt** via `POST /api/v1/lifeos/builder/build`. Was 24-line truncated stub (ended mid-sentence). Now 90 lines with complete Stripe integration. `ok:true committed:true`.
- **SIS1 still PENDING_CONFIRMATION**. Forge cursor at pos 10, expected to fire at pos 0 (`site-builder-postmark-send`) within the next two Forge cycles (~04:37 UTC).
- **Nova throughput confirmed healthy**: 2 commits/cycle (CSS/HTML), cycles 194–196 all clean.

### Verification
- `npm test`: 8/8 pass
- Compliance: 12/12 pass
- `node --check services/tc-stripe-service.js`: PASS (90 lines)
- `node --check services/deployment-service.js`: PASS

### Next step
Confirm SIS1. Then tc-webhook-validator quality review. Then post-commit smoke router.

---

## [FIX] Update 2026-05-13 — GOVERNANCE_LOCK_CONTINUOUS_OPERATION cycle 1

### What happened
- **Repo sync gap discovered and closed.** Local was 32 commits behind `origin/main` (Railway autonomous builders had been pushing while we were working on SC1). `git pull --rebase origin main` applied cleanly — zero file conflicts.
- **13 working-tree files were never pushed to git.** Created during RL1/RL2/OF1/RRS1/OD1 sessions, these scripts, test files, and mockups existed only in the stash: `scripts/operator-runtime-status.mjs`, `scripts/generate-operator-dashboard-json.mjs`, `scripts/generate-runtime-reality-snapsho

## Snippet — Council lane

## [BUILD] Update 2026-04-26 #2 — Runtime authority + future-back consensus enforcement

### Files changed
- `routes/lifeos-council-builder-routes.js` — builder dispatch now consults Memory Intelligence routing, fails closed when no authorized model is allowed, and records protocol violations on unverifiable output.
- `routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-council-run.js`, `prompts/lifeos-gate-change-proposal.md` — gate-change debate now requires future-back analysis, filters blocked models, and persists debate artifacts into memory.
- `config/task-model-routing.js` — static routing is now preference only; candidate-model ordering exported for runtime authority filtering.
- `services/memory-intelligence-service.js`, `routes/memory-intelligence-routes.js`, `db/migrations/20260426_memory_intelligence_hardening.sql`, `db/migrations/20260426_memory_protocol_enforcement.sql` — protocol violations, task authority, routing recommendation, debate future-lookback.
- `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, `docs/SSOT_COMPANION.md`, `docs/AGENT_RULES.compact.md`, `scripts/generate-agent-rules.mjs` — council law, anti-corner-cutting rule, and compact cold-start packet updated; generator now keeps the rule durable.

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
- `config/codebook-v1.js`, `services/prompt-translator.js`, `services/lcl-monitor.js`, `db/migrations/20260419_lcl_quality_log.sql`, `services/council-service.js`, `routes/lifeos-council-builder-routes.js`, `startup/register-runtime-routes.js`, `server.js`, `docs/projects/AMENDMENT_01_AI_COUNCIL.md`

### State after that session
- LCL Layer 1.5 live on `callCouncilMember`; drift monitor with per-(member, taskType) rollback.
- `GET /api/v1/lifeos/builder/lcl-stats` live.

### Next agent (council lane): start here
1. Confirm `db/migrations/20260419_lcl_quality_log.sql` applied on Neon (auto on deploy).
2. Fix gaps documented in `AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` → Approved backlog (Ollama `inspect`, static codebook import — may already be shipped in a later commit).
3. Conflict interrupt + Lumin reactions remain **LifeOS lane** (`CONTINUITY_LOG_LIFEOS.md` + `prompts/lifeos-conflict.md`).

---


## Amendment 36 (Zero-Drift) — abstract

# AMENDMENT 36 — Zero-Drift Handoff & Cold-Start Protocol

| Field | Value |
|-------|--------|
| **Lifecycle** | `infrastructure` |
| **Reversibility** | `two-way-door` |
| **Stability** | `operational` |
| **Last Updated** | 2026-05-12 — **NSSOT §2.10 ¶8–10** (audit epistemic format, improvement-idea council rule, truth-first order — constitutional clarification, no existing law changed). Prior: **OF1 + QP1 + LA1** — operator freshness fail-closed (`scripts/operator-runtime-status.mjs`, `scripts/generate-operator-dashboard-json.mjs`, `tests/operator-runtime-status-freshness.test.js`, `package.json` test list); LifeOS product queue split (`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json` code-only, docs/spec backlog in `LIFEOS_DOCS_QUEUE.json`); lane accountability hardening (`scripts/lifeos-builder-continuous-queue.mjs`, `scripts/tsos-builder-auditor.mjs`, `scripts/operator-stale-failure-detect.mjs`, RL1/RL2 lane scoping) plus quarantine normalization so Nova no longer inherits TC / Site Builder rows. Prior: **SF1** — **`npm run operator:stale-failure-detect`** → **`scripts/operator-stale-failure-detect.mjs`**; **`data/operator-stale-failure-log.jsonl`**; **`docs/OPERATOR_DASHBOARD_JSON.md`** § **2f**; **`package.json`**; **`.gitignore`** — Prior: **RL2** — **`npm run operator:repair-loop:r2`** → **`scripts/operator-repair-loop-r2-once.mjs`**; **`tests/tc-morning-digest-service-module.test.js`**; **`docs/OPERATOR_DASHBOARD_JSON.md`** § **2e**; **`docs/projects/AMENDMENT_17_TC_SERVICE.md`**; **`package.json`** — Prior: **RL1 + RL1-test-verify** — **`npm run operator:repair-loop`** → **`scripts/operator-repair-loop-once.mjs`**; **`services/site-builder-postmark-helper.js`** + **`tests/site-builder-postmark-helper.test.js`** (**`node:path`** import — **`npm test`** gate); **`data/operator-repair-loop-log.jsonl`**; **`docs/OPERATOR_DASHBOARD_JSON.md`** § **2d**; **`docs/projects/AMENDMENT_05_SITE_BUILDER.md`**; **`docs/CONTINUITY_LOG.md`**; **`package.json`** — Prior: **SW1 + OS1 PATH** — **`npm run tsos:system-watch`** → **`scripts/tsos-system-watch.mjs`**; **`data/system-watch-log.jsonl`**; **`scripts/tsos-overseer-daemon.mjs`** — **`childEnvForChecks()`** (Homebrew **`PATH`** for **`npm`**); **`SYSTEM_CAPABILITIES`** **SW1**; **`docs/OPERATOR_DASHBOARD_JSON.md`** § **2c**; **`docs/OPERATIONAL_REALITY_SYNC.md`** §5 — Prior: **OH1** — **`npm run operator:status`** / **`tsos:operator-status`** → **`scripts/operator-runtime-status.mjs`**; **`data/operator-s

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

**Supreme law:** This section **implements** `docs/SSOT_NORTH_STAR.md` → **Article II §2.6 System Epistemic Oath**, **Article II §2.10**, **Article II §2.11 (code the system / gaps; the system programs amendments & projects; `GAP-FILL` on the platform only)**, **Article II §2.11c (Conductor as supervisor — system codes at scale; audit, debate, report; not default IDE product authorship)**, **Article II §2.12 (technical decisions → AI Council + best-practice research; consensus / full debate if split; Conductor/Construction supervisor SSOT re-read and drift detection; non-derogable)**, **Article II §2.14 (TSOS machine-channel lexicon: `docs/TSOS_SYSTEM_LANGUAGE.md` — machinery only; not §2.11b)**, and **Article II §2.15 (operator instruction supremacy; anti-steering; honest limits of paper law on external LLMs)** for the LifeOS lane and Adam-facing agents. It may add detail; it may **not** weaken §2.6, §2.10, §2.11, **§2.11c**, **§2.12**, **§2.14**, or **§2.15**.

**§2.6 is mandatory:** law cannot be skipped for speed; **cutting corners** and **laziness** (skipped reads, sk

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
