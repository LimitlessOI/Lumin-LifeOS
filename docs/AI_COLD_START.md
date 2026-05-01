# AI Cold Start Packet

> **AUTO-GENERATED** — do not hand-edit. Regenerate: `npm run cold-start:gen`
> Generated: 2026-05-01T20:14:33.347Z

## Read order (mandatory)

1. `docs/CONTINUITY_INDEX.md` — pick your lane.
2. `prompts/00-LIFEOS-AGENT-CONTRACT.md` — epistemic baseline (§2.6, §2.11, §2.15).
3. `prompts/00-SSOT-READ-SEQUENCE.md` — ordered SSOT reads (anti-drift).
4. `prompts/00-MODEL-TIERS-THINK-VS-EXECUTE.md` — think vs execute model policy.
5. This file (you are reading it).
6. The lane log for your task (`CONTINUITY_LOG_LIFEOS.md` / `CONTINUITY_LOG_COUNCIL.md` / main log).
7. Owning manifest JSON (e.g. `AMENDMENT_21_LIFEOS_CORE.manifest.json`) for structured next steps.
8. `prompts/<domain>.md` when using the builder.

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
5. Read `AMENDMENT_21_LIFEOS_CORE.md → ## Approved Product Backlog` for next priority when the task is LifeOS.

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

## [BUILD] Update 2026-05-01 #7 — Supervisor Lens C (prior art + industry, improve-don’t-copy)

### Files changed
- `docs/SUPERVISOR_CONSEQUENCE_LENS.md` — **Lens C**: internal prior art (**/builder/gaps**, SSOT receipts, code, council residue); external industry/regulatory/postmortem (**THINK** until cited); **C3** record improvement delta.
- `docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`, `docs/QUICK_LAUNCH.md`, `scripts/lifeos-builder-supervisor.mjs` — aligned wording + CLI reminder lines.
- `AMENDMENT_21` receipt + manifest.

### Next agent: start here
For Lens C2, put **URLs or document titles** in §2.11b closes so claims stay falsifiable.

## [PLAN] Update 2026-05-01 #6 — Optional consequence + “two-year-back” supervisor lens

### Files changed
- `docs/SUPERVISOR_CONSEQUENCE_LENS.md` — discretionary when-to-use rubric; Lens A unintended consequences; Lens B premortem; outputs (§2.11b / council).
- `docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md` + `docs/QUICK_LAUNCH.md` — links + execution-protocol bullet.
- `scripts/lifeos-builder-supervisor.mjs` — `--consequence-lens` prints short reminder (no API).
- `AMENDMENT_21` receipts + Platform handoff; manifest tail.

### State after this session
Adam gets **structured regret / second-order thinking** without making it mandatory on every trivial commit — aligns with §2.6 honest reporting and §2.11b residue risk.

### Next agent: start here
Use the lens after **large** autonomy, **schema/billing/auth** changes, or **relaxing verifiers**; skip for typos/docs-only/low-risk.

## [FIX] Update 2026-05-01 #5 — Consensus protocol finder + truthful supervisor close

### Files changed
- `docs/QUICK_LAUNCH.md` — operator-facing *Consensus protocol* subsection (links to Amendment 01, Companion 5.5, North Star Article II, evidence ladder docs). Answers “where is my consensus protocol?” without duplicating constitutional text.
- `scripts/lifeos-builder-supervisor

## Snippet — LifeOS lane

## [BUILD] Update 2026-04-29 #1 — **Overnight dashboard: `dashboard-theme-foundation` + receipts**

### Shipped / verified (system path)
- **`public/shared/lifeos-dashboard-tokens.css`** — **`POST /api/v1/lifeos/builder/build`** via **`npm run lifeos:builder:overnight -- --task dashboard-theme-foundation`** (`claude_via_openrouter`, **`committed:true`**). Prod **`GET /shared/lifeos-dashboard-tokens.css`** **200**, **2607** bytes (= local).

### Related platform (local amendment of prior gap)
- **`routes/lifeos-council-builder-routes.js`** — **`mirrorCommittedContentToRepoRoot`** after **`autoWireRoute`** register commit (**chained **`files[]`** FS parity).

### Doc / SSOT
- **`docs/projects/AMENDMENT_21_LIFEOS_CORE.md`** — receipts + **`## Agent Handoff Notes`**: next **`dashboard-import-tokens`**. **`docs/CONTINUITY_LOG.md`** **`[BUILD]`** block.

### Next
- **`npm run lifeos:builder:overnight -- --task dashboard-import-tokens`** (minimal `<link>` in **`lifeos-dashboard.html`**).

---

## [BUILD] Update 2026-04-27 #18 — Victory Vault root API contract now exists on the runtime spine

**Shipped:**
- `routes/lifeos-victory-vault-routes.js` — top-level LifeOS compatibility router for POST/GET `/api/v1/lifeos/victories` and POST/GET `/api/v1/lifeos/victories/reels`, backed by the existing `createVictoryVault()` service and `makeLifeOSUserResolver()`.
- `startup/register-runtime-routes.js` — imports + mounts the new router at `/api/v1/lifeos` and logs the mount distinctly from `/api/v1/lifeos/growth`.
- `scripts/lifeos-verify.mjs` — route inventory now fails if `routes/lifeos-victory-vault-routes.js` disappears.

**State after this session:**
- Live diagnosis before fix was concrete: `GET /api/v1/lifeos/victories?user=adam` returned `404`, while `GET /api/v1/lifeos/growth/victories?user=adam` returned `200`.
- Lumin build bridge was used for reconnaissance first: `/api/v1/lifeos/chat/build/plan` correctly identified the Victory Vault mismatch as the highest-value LifeOS defect, but its plan text truncated and the draft suggested a weaker proxy pattern.
- The council builder then produced the actual runtime fix. After Railway redeployed, both `GET /api/v1/lifeos/victories?user=adam` and `GET /api/v1/lifeos/victories/reels?user=adam` returned `200`.

**Next:** Run the builder HTML smoke on a real LifeOS target, then do the household invite E2E flow. After those verification items, the next real product build is the first vertical slice of Commitment -> execution desk.

---

## [BUILD] Update 2026-04-26 #17 — LifeOS build lanes now obey Memory Intelligence authority

**Files changed:**
- `services/lifeos-lumin-build.js` — plan/draft now consult Memory Intelligence routing before selecting a model; blocked tasks fail closed instead of silently falling back.
- `routes/lifeos-gate-change-routes.js` — gate-change debate persists structured debate memory and filters unauthorized models before council runs.
- `startup/register-runtime-routes.js`, `routes/memory-intelligence-routes.js` — `/api/v1/memory/*` mounted into runtime so LifeOS lanes can log debates, intent drift, authority, and violations.
- `docs/SSOT_COMPANION.md`, `docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md` — future-back and anti-corner-cutting rules now part of the operating law, not just the brainstorm brief.

**State after this session:**
- Lumin plan/draft and gate-change flows now use the same evidence/routing system instead of static model preference only.
- Debate memory i

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
| **Last Updated** | 2026-04-30 — repo-backed Cursor review path promoted beyond one laptop: tracked **`githooks/pre-push`** template + **`scripts/install-git-hooks.mjs`** installer + `npm run hooks:install`; **`scripts/cursor-pre-push-review.mjs`** now optionally posts review receipts into AM39 memory when `PUBLIC_BASE_URL` + command key are present. Prior: 2026-04-30 — local pre-push AI bug review path: tracked **`scripts/cursor-pre-push-review.mjs`** + **`.cursor/BUGBOT.md`** review rules + `package.json` script + `.gitignore` allowlist for tracked Bugbot config / local review artifacts; local `.git/hooks/pre-push` may call the tracked script in `warn` or `strict` mode. Prior: 2026-04-25 — **`scripts/generate-agent-rules.mjs`** — new **IDEA VAULT (Lane A/B)** block in **`docs/AGENT_RULES.compact.md`**: vault = map/routes only; source threads + **`raw/`** = nuance; promote via chunk → **38** §A or **`import-dumps-to-twin`**; tools + **INDEX** queue order; MEMORY/COUNCIL/SSOT/PROHIBITED lines tightened (token budget law). Prior: **`AMENDMENT_38_IDEA_VAULT.md`** + manifest; **`REPO_MASTER_INDEX`**; **`CONVERSATION_DUMP_IDEAS_INDEX`**. Prior: **`CONVERSATION_DUMP`** + **`INDEX.md`** candidates. Prior: **`REPO_BUCKET_INDEX`**. Prior: **`REPO_DEEP_AUDIT`**. Prior: **`npm run repo:catalog`**. Prior: **TSOS** in **`prompts/00`**. Prior: **`SSOT_DUAL_CHANNEL`**. Prior: **§2.11c**. Prior: **§2.15** + §2.14. |
| **Manifest** | _(none — this amendment is documentation + scripts; machine hooks live in `package.json` and `.github/workflows`)_ |
| **Verification** | `npm run handoff:self-test` → exit 0; `npm run cold-start:gen` regenerates `docs/AI_COLD_START.md` |

**Parent:** `docs/SSOT_NORTH_STAR.md`, `docs/SSOT_COMPANION.md`, `CLAUDE.md`

---

## Mission

Make every AI session **bounded**, **auditable**, and **non-hallucinatory** by forcing reads and writes through explicit lane manifests, generated cold-start packets, and optional strict git gates — without compressing human-readable SSOT markdown into LCL (that remains forbidden for amendments; use manifests for machine pulls).

---

## Autonomous build charter (blueprint → house)

**Principle:** Once a feature or product is **fully specified** in SSOT (amendment + manifest + readiness gates + acceptance check

## Amendment 21 — Agent Handoff Notes region

## Agent Handoff Notes` section at the bottom of `## Approved Product Backlog`
2. Read the last 3–5 rows of `## Change Receipts` at the bottom of this file
3. Read `docs/CONTINUITY_INDEX.md` + the correct lane log + `docs/CONTINUITY_LOG.md` for cross-cutting history
4. Check that what the SSOT says matches what is actually in the codebase — if it doesn't, fix the SSOT

**Your job after every file you write or edit:**
- Update `## Change Receipts` with: what changed, why, what it does, any known issues
- Update `## Agent Handoff Notes` with the current state and next priority
- Update `docs/CONTINUITY_LOG.md` with a one-paragraph summary

**The standard is: painstakingly accurate, embarrassingly detailed, written for someone with zero memory of this project.**

If you were cut off mid-task, find your last `## Change Receipts` entry and look for `⚠️ IN PROGRESS:` markers.

---

## Adam ↔ Agent epistemic contract (NON-NEGOTIABLE)

**Supreme law:** This section **implements** `docs/SSOT_NORTH_STAR.md` → **Article II §2.6 System Epistemic Oath**, **Article II §2.10**, **Article II §2.11 (code the system / gaps; the system programs amendments & projects; `GAP-FILL` on the platform only)**, **Article II §2.11c (Conductor as supervisor — system codes at scale; audit, debate, report; not default IDE product authorship)**, **Article II §2.12 (technical decisions → AI Council + best-practice research; consensus / full debate if split; Conductor/Construction supervisor SSOT re-read and drift detection; non-derogable)**, **Article II §2.14 (TSOS machine-channel lexicon: `docs/TSOS_SYSTEM_LANGUAGE.md` — machinery only; not §2.11b)**, and **Article II §2.15 (operator instruction supremacy; anti-steering; honest limits of paper law on external LLMs)** for the LifeOS lane and Adam-facing agents. It may add detail; it may **not** weaken §2.6, §2.10, §2.11, **§2.11c**, **§2.12**, **§2.14**, or **§2.15**.

**§2.6 is mandatory:** law cannot be skipped for speed; **cutting corners** and **laziness** (skipped reads, skipped verify, “good enough” truth) are **forbidden** — HALT or do the full gate; never ship noncompliance. **Exception path (¶8):** a **hypothesis** that specific gates are redundant or inefficient must be labeled **THINK/GUESS**, sent to **AI Council debate** (`AMENDMENT_01` + Companion §5.5), and only **then** implemented with receipts — never silent solo removal.

**Adam required this in SSOT and in `prompts/*` so cold agents cannot “help” him into false confide
