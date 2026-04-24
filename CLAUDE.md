# CLAUDE.md — LifeOS/LimitlessOS Project Instructions

---

## ⚠️ AGENT CONTINUITY PROTOCOL — READ THIS FIRST, EVERY SESSION

**Adam hits usage limits frequently. You may be the 10th agent to work on this project. The agent before you may have been cut off mid-sentence. You are responsible for making sure the NEXT agent can pick up exactly where you left off — even if that agent has zero memory of anything that happened.**

**This is the most important operational rule in this file.**

**Truth channel — constitutional (North Star Article II §2.6):** The system must **never lie or mislead** — not to Adam, not to any user, not in **internal** status (green when red, “done” when unverified). Misleading = lying. **§2.6 is mandatory:** it cannot be skipped for speed or tokens; **cutting corners** and **laziness** on reads/verify/receipts are **forbidden** — HALT or comply fully. **¶8 governed path:** a hypothesis that gates X/Y/Z are wasteful must be **THINK/GUESS**, **debated by the AI Council**, then implemented with receipts (`docs/SSOT_COMPANION.md` §5.5, `docs/projects/AMENDMENT_01_AI_COUNCIL.md`) — never solo removal of checks. **Article II §2.12 (non-derogable):** load-bearing **technical** decisions go through the **AI Council** after **best-practice / authoritative research** when needed; **consensus** first, full **debate** if split; **Conductor** / **Construction supervisor** must **re-read** SSOT every session and **detect drift** (receipts vs verifiers/runtime). Only **Article VII** amends §2.12. **Real** multi-model debate = **`POST /api/v1/lifeos/gate-change/run-preset`** (body `preset: maturity|program-start`) or **`.../proposals/:id/run-council`** on the **running** app — debate runs with **the server’s** provider keys (Railway). Client only needs **`COMMAND_CENTER_KEY` + `PUBLIC_BASE_URL`** for `npm run lifeos:gate-change-run` (see `docs/QUICK_LAUNCH.md`). **Not** a single IDE chat claiming “the council agrees.” **Correct** any misunderstanding the instant you detect it (stop-the-line). **Fill gaps** everywhere. Operational prompts: `prompts/00-LIFEOS-AGENT-CONTRACT.md`. LifeOS: `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` → **## Adam ↔ Agent epistemic contract**.

### The Contract

After EVERY file you write or edit, you MUST update its SSOT amendment with:
1. **What changed** — exact file name, what was added/modified/removed
2. **Why** — the reason, the user request that triggered it, the problem it solves
3. **Current state** — what works, what is stubbed, what is broken or known incomplete
4. **What comes next** — the very next thing that needs to be built or fixed, specific enough that a cold agent can start without asking

This is not a summary at the end of a session. It is atomic — one file changed → SSOT updated before moving to the next file.

### The Standard for SSOT Detail

**Painstakingly accurate. Embarrassingly detailed. Written for someone with no memory.**

- Every new table must be named in the SSOT with its columns described
- Every new service function must be named and its behavior described in one line
- Every new route endpoint must be listed with its method, path, and what it does
- Every known bug or incomplete stub must be flagged with `⚠️ INCOMPLETE:` so the next agent knows
- Every approved-but-not-yet-built item must be in a `## Approved Product Backlog` section with enough spec that work can start immediately

### What Happens If You Skip This

The next agent reads stale docs, rebuilds what already exists, breaks what works, or asks Adam to explain context he's already explained 3 times. Adam loses usage time, work gets duplicated, and the product falls behind. **Do not let this happen.**

### Session Start Checklist (do this before writing a single line of code)

1. Read `AMENDMENT_21_LIFEOS_CORE.md` — specifically the `## Approved Product Backlog` and `## Agent Handoff Notes` sections
2. Read the most recent `## Change Receipts` entries (last 3–5 rows)
3. Check `docs/CONTINUITY_LOG.md` for the latest session summary
4. If anything conflicts between what the SSOT says and what the code actually contains — fix the SSOT, don't assume the SSOT is right
5. If you will **edit any SSOT document** this session, obey **`## SSOT READ-BEFORE-WRITE`** below **before** the first edit to that file
6. **Railway evidence Adam already posted this thread** (screenshot, name list, “X is set”) → **never** ask him to re-prove or re-set those names; **never** claim they are absent from Railway because **Cursor/CI `process.env` is empty** — only diagnose shell export, `PUBLIC_BASE_URL`, `x-command-key`, deploy drift (404), or verifier skip (`docs/ENV_DIAGNOSIS_PROTOCOL.md` *Operator-supplied evidence*). Violation = **§2.6 misleading**.

### Session End Checklist (do this before stopping, even if cut off mid-task)

1. Update the amendment's `## Change Receipts` table with everything done this session
2. Update `## Agent Handoff Notes` with exact current state + next priority
3. Update `docs/CONTINUITY_LOG.md` with a one-paragraph session summary
4. Mark any in-progress work with `⚠️ IN PROGRESS:` in the amendment so the next agent doesn't re-start it from scratch
5. If you were cut off before finishing something, write exactly where you stopped

---

## READ NEXT

**Token-efficient path (normal build sessions — ~800 tokens vs ~8000+):**
Read `docs/AGENT_RULES.compact.md` — compressed enforcement packet.
This replaces full NSSOT + Companion for routine work. Full NSSOT required ONLY when:
- Editing a constitutional document
- Facing a constitutional conflict
- First-time project onboarding

Then read:
- `docs/QUICK_LAUNCH.md` — lane routing + execution protocol
- `docs/CONTINUITY_LOG.md` — Latest session summary and handoff state

**Full read (constitutional sessions only):**
- `docs/SSOT_NORTH_STAR.md` — Constitution, mission, philosophy (THIS WINS ALL CONFLICTS)
- `docs/SSOT_COMPANION.md` — Operations, enforcement, technical specs

If those files don't exist, ASK for them before proceeding.

---

## SYSTEM SELF-EXECUTION RULE (Read This Every Session)

**If the system can do it → have the system do it.**
**If the system can't do it yet → build the capability, then have the system do it.**

**North Star Article II §2.11 — system vs. project:** **Code the system** (platform) only for **gaps** or **broken** parts, or to get **Lumin** to do what a Conductor can do in an IDE — **small or extensive**, **`GAP-FILL` receipts** required. The **system programs** **amendments and projects**; a session in an external IDE/AI is **Conductor** or **Construction supervisor** to **orchestrate** that — **not** the primary hand-author of **amendment/product** code. Detail: `docs/SSOT_COMPANION.md` §0.5D.

Adam is the decision-maker, not the executor. Never ask him to manually do something the system can handle.

Before asking Adam to touch any UI, CLI, or dashboard — ask: does the running Railway app have an API for this?

| Task | How the system does it |
|------|----------------------|
| Set Railway env vars | `POST /api/v1/railway/env/bulk` with `x-command-key` header |
| Trigger redeploy | `POST /api/v1/railway/deploy` — or **`npm run system:railway:redeploy`** (same API) |
| DB schema changes | Write migration → commit → auto-applies on boot |
| Git commits | `services/deployment-service.js` → `commitToGitHub()` |
| Read Railway vars | `GET /api/v1/railway/env` |

**Full matrix (env per capability, gaps, changelog):** `docs/SYSTEM_CAPABILITIES.md` — update it whenever you add or fix a self-serve path.

Only escalate to Adam when a **decision** is needed — approvals, credentials that don't exist anywhere yet, or judgment calls.

---

## BUILDER-FIRST RULE — NON-NEGOTIABLE (§2.11 / §2.11a + §2.11b)

**The platform is TokenSaverOS (TSOS).** The **council builder** is the **meta-product** (North Star **Article II §2.11a**): it is what will build most other things. **Refine the builder and preflight** before burning months on unverified “features.” **Do not conflate** §2.11a (what we build first) with **Article II §2.11b** (how the Conductor **evaluates and reports** to the operator) — see Companion **§0.5G**. Adam is not a full-time code reviewer at scale — for directed build/review slices you **must** return a **plain-language report** (§2.11b): what we did, **quality score (e.g. 6→9) with evidence**, *why this design vs that*, and what is **not** proven yet. **Governed** self-build of the pipeline is a goal, never a silent shortcut (§2.6, §2.10, §2.12, receipts).

**This rule exists because text-only enforcement fails. Every agent that violated §2.11 did so because the builder loop was broken and there was nothing to stop them from hand-coding product directly. Both problems are now fixed. This rule is the machine-readable version of §2.11.**

### Conductor scope (Adam directive — **no IDE bypass of the system**)

- **You ship one thing:** the **builder pipeline** and its **integrity** (routes that *mount* the builder, preflight, `/ready`, `/task`, `/build`, `/execute`, audit tables, prompts the builder reads, verifiers that prove it).
- **You do not** hand-implement product code **or** builder internals that the council can emit as a **`target_file`** — including **`routes/lifeos-council-builder-routes.js`**, **`services/lifeos-lumin*.js`**, **`public/overlay/*.html`**, etc. — **except** after a **failed** `POST /api/v1/lifeos/builder/build` (or `/task` + `/execute`) that is **logged in the Change Receipt** with HTTP status / error body / `committed:false` reason, then **`GAP-FILL: <exact reason>`**.
- **Oversee:** read council output, grade it, request re-run with tighter `spec`, open gate-change if load-bearing — **do not replace the council with your own patch** to “save time.”
- **Env:** Operator exports keys into the shell from Railway; machine log of readiness → `npm run builder:preflight` appends **`data/builder-preflight-log.jsonl`** (see `docs/BUILDER_OPERATOR_ENV.md`). **Never** paste secret **values** into SSOT.

### Before writing ANY file in these paths:
- `routes/` (**including** `routes/lifeos-council-builder-routes.js` — **no** automatic exception)
- `services/` (except narrow wiring listed below only if truly non-builder)
- `db/migrations/`
- `public/overlay/`

**You MUST first prove the builder is reachable (fail-closed for excuses):**
```bash
npm run builder:preflight
# or: node scripts/council-builder-preflight.mjs
```
- Exit **0** → base URL and auth are aligned; `GET /ready` (when deployed) shows whether **GITHUB_TOKEN** / `commitToGitHub` and **council** are live.
- Exit **1** → **HALT** product hand-authoring. Fix what it prints: `PUBLIC_BASE_URL`, **COMMAND_CENTER_KEY** (match Railway), `GITHUB_TOKEN` on the server, or start `npm start` locally.
- Exit **2** → key mismatch; set the same value locally that Railway has for `COMMAND_CENTER_KEY` / `LIFEOS_KEY` / `API_KEY`.

**Adam / operator: set `BUILDER_PREFLIGHT=strict` in your environment** to make pre-commit **fail** if preflight fails (see `.git/hooks/pre-commit`). Default is **warn** so offline sessions can still commit with an explicit `GAP-FILL:`.

**Then** attempt the system author:
```bash
POST /api/v1/lifeos/builder/build
{
  "domain": "<domain from prompts/>",
  "task": "<what needs to be built>",
  "spec": "<full specification>",
  "target_file": "<repo-relative path OR omit to let placement decide>",
  "commit_message": "[system-build] <description>"
}
```

### If the builder returns `{ ok: true, committed: true }`:
→ **You are done.** Do NOT also write the file yourself. The system built it. Update the SSOT receipt with `model_used` from the response.

### If the builder returns `committed: false` (no target_file in placement):
→ Read the `output`, verify it looks correct, then call `POST /api/v1/lifeos/builder/execute` with `{ output, target_file, commit_message }`.

### Only if the builder call fails entirely (HTTP 5xx, `GITHUB_TOKEN` missing, council error):
→ You may write the file directly. **This is a GAP-FILL.** You MUST:
1. Document the exact failure reason in the Change Receipt as `GAP-FILL: <reason>` **and** attach evidence the **`POST /build` (or `/task`+`/execute`) was attempted** (timestamp, endpoint, status).
2. Fix the platform failure that caused the bypass in the same session **or** queue `pending_adam` — never “I skipped /build because I was sure.”
3. Never accept "the builder doesn't work" as a permanent state — fix it and re-run

### What counts as a platform/infra exception (no builder required):
- Files in `startup/`, `middleware/`, `core/` that are **composition-only** wiring (not feature logic the builder should emit)
- **`config/*.js`** only when the change is **static routing table / constants** that **cannot** be generated safely by council in one file (still prefer `/build` when in doubt)
- Fixing a syntax error or broken import in a file **the builder just committed** (smallest repair, then re-run verify)
- SSOT documents (`docs/`, `prompts/`) **when** they are receipts / law text — but **prefer** the builder to update `prompts/*.md` when the change is bulk domain context

### Why this matters:
Adam's token budget is limited. Every feature the Conductor hand-codes is a feature that costs Cursor/Claude tokens instead of free Railway council tokens. The builder runs on Railway's keys. The Conductor has hard usage limits. Every §2.11 violation burns Adam's budget twice: once to write it, once when the next agent re-reads and re-debates what was already built.

**Check the builder is working at session start:** `npm run builder:preflight` (or `GET /api/v1/lifeos/builder/ready` + `GET /domains` with `x-command-key`).

**Env “missing” claims:** follow **`docs/ENV_DIAGNOSIS_PROTOCOL.md`** + **`docs/ENV_REGISTRY.md`** (deploy inventory). If the **name** exists in the vault list, do **not** assert absence — diagnose shell vs Railway, base URL, and header aliases first; use **`POST /api/v1/railway/env/bulk`** when the system may fix non-human-gated values; **Adam** only for secret rotation after proof no other cause.

If you **cannot** run it (no network, no keys) → you must say so to Adam in the handoff, use **`GAP-FILL: no COMMAND_CENTER_KEY in session; cannot reach Railway`**, and the **next** work item is to fix keys or run from an operator shell — not to pretend the builder was used.

---

## ZERO WASTE AI CALL RULE — READ BEFORE WRITING ANY SCHEDULED TASK

**Every AI call must be useful work. No exceptions.**

Before any code that calls `callCouncilMember`, `callCouncilWithFailover`, or any AI provider:
1. Is it triggered by a direct user action? → Allowed.
2. Is it a scheduled/background task? → It MUST go through `createUsefulWorkGuard()` in `services/useful-work-guard.js`.

`createUsefulWorkGuard()` requires you to declare:
- **prerequisites** — what env vars / credentials must exist (e.g. IMAP not configured = no email triage)
- **workCheck** — a DB query proving real work exists (e.g. no active transactions = no deadline cron)
- **purpose** — what actionable output this call produces

If prerequisites fail or work check returns 0 → skip entirely. No AI call. No tokens burned.

**Pattern for every new scheduled AI task:**
```js
import { createUsefulWorkGuard, requireEnvVars, requireTableRows } from '../services/useful-work-guard.js';

const guarded = createUsefulWorkGuard({
  taskName: 'My Task',
  purpose: 'What useful thing this produces for Adam',
  prerequisites: requireEnvVars('REQUIRED_VAR'),
  workCheck: requireTableRows(pool, 'SELECT COUNT(*) FROM my_table WHERE active = true'),
  execute: async () => { /* only runs if above pass */ },
  logger,
});
setInterval(guarded, INTERVAL_MS);
```

**Never do this:**
```js
// ❌ WRONG — fires regardless of whether there's work to do
setInterval(() => callCouncilMember(...), 30 * 60 * 1000);
```

---

## HARD RULES (Always Apply)

### Priority
1. SSOT North Star (constitution)
2. SSOT Companion (operations)
3. This file
4. Everything else

### Non-Negotiables

**Zero-Degree Protocol:** Every action maps to North Star or Outcome Target. If not → HALT and ask.

**Evidence Rule:** No operational steps without seeing user's state OR user confirms what they see. No assumed UI. No "click X" unless confirmed X exists.

**Honesty Standard:** Never deceive. Label uncertainty:
- KNOW = verified by evidence
- THINK = inference with rationale
- GUESS = low confidence, request verification
- DON'T KNOW = explicitly unknown

**User Sovereignty:** Never manipulate or steer against user goals. No dark patterns.

**Fail-Closed:** If required info is missing → HALT, state what's missing, request minimum evidence.

### Modes
- **Step-by-Step:** Exact locations, never skip steps, checkpoints. Use when: executing, deploying, money involved, user asks "how do I..."
- **Brainstorm:** Explore fast. Use when: strategy, options, ideation.
- If unclear → ask: "Step-by-step or brainstorm?"

### High-Risk (Require Extra Caution)
- Money > $100
- Irreversible actions (deletion, deployment, send)
- Health/safety implications
- Legal exposure
- Data destruction

### Secrets
NEVER output API keys, tokens, passwords, private keys. If you see one exposed → recommend rotation.

---

## READ-BEFORE-EDIT — HARD RULE (NON-NEGOTIABLE)

**You MUST read the full current file before any Edit or Write on an existing file. No exceptions.**

This applies to: source files, migrations, overlays, config files, HTML, SQL, and SSOT docs equally.

**Why:** The file on disk is the source of truth — not context memory, not the session summary, not what you think is there. A cold agent skipping the read can overwrite in-progress work, duplicate code that already exists, or make an edit that conflicts with the actual file state.

**When you may skip the read:** Only if you literally just wrote the file in the same response (the file can't have changed since you wrote it).

**When the file is too large for one read:** Read the section you are editing + the surrounding context (function signature, imports, end of file). Never edit from memory alone.

**Violation:** If you edit a file without reading it first, you are guessing. Guessing is lying. HALT and read first.

---

## CODE OUTPUT RULES

**Critical:** User has requested specific formatting:

1. **Artifacts only for code** — Put all code inside artifacts/files, not in chat
2. **Full code always** — Never give partial code or snippets to merge. Give the COMPLETE file every time.
3. **Look at every word** — Before generating new code, review the ENTIRE existing code. Nothing gets lost.
4. **Labels outside** — Code blocks contain ONLY what to paste. All instructions/labels go outside the block.
5. **Ask for current code** — If you don't have the most recent version of a file, ASK before writing.

---

## SERVER.JS IS A PROTECTED BOUNDARY — READ THIS BEFORE TOUCHING ANYTHING

`server.js` is a **composition root only**. Its only jobs are:
1. Load config
2. Create the db pool, app, and server
3. Call `registerMiddleware`, `registerRoutes`, `bootDomains`
4. Call `app.listen`

**NEVER add to server.js:**
- Feature routes (put in `routes/`)
- Service logic (put in `services/`)
- Domain boot code / async IIFEs (put in `startup/boot-domains.js`)
- Inline config objects like COUNCIL_MEMBERS (put in `config/`)
- Cron registration (put in `startup/register-schedulers.js`)
- Any `let x = null` global state (put it in the service that owns it)

**WHERE NEW THINGS GO — mandatory lookup before writing code:**

| What you're adding | Where it goes |
|--------------------|--------------|
| New API feature | `routes/<feature>-routes.js` + `services/<feature>.js` |
| Boot/startup logic | `startup/boot-domains.js` |
| Scheduler / cron | `startup/register-schedulers.js` |
| Config values | `config/<topic>.js` |
| DB migration | `db/migrations/<date>_<name>.sql` |
| Inline Railway/env routes | `routes/railway-managed-env-routes.js` |

**If you are an AI agent and you are about to add code to server.js — STOP.**
Find the correct target file from the table above and put it there instead.
If no target file exists, create it. Do not use server.js as a fallback.

---

## SYSTEM ARCHITECTURE

**Infrastructure:**
- Server: Railway (Node.js/Express)
- Database: Neon (PostgreSQL)
- Repository: GitHub

**Key Files:**
- `server.js` — Composition root ONLY (see boundary rules above)
- `startup/` — Boot sequences, route registration, scheduler setup
- `routes/` — One file per feature domain
- `services/` — Pure service logic, no app wiring
- `config/` — Static config (council members, feature flags, pricing)
- `package.json` — Dependencies (protected)
- `/public/overlay/` — Frontend UI

**Environment Variables (Railway):**
- DATABASE_URL — Neon PostgreSQL connection
- ANTHROPIC_API_KEY — Claude API
- OPENAI_API_KEY — GPT API
- GITHUB_TOKEN — For auto-commits
- COMMAND_CENTER_KEY — API authentication

---

## CURRENT STATE

**Live:**
- Server on Railway
- Database on Neon
- Overlay (partial)
- AI Council routing
- Memory persistence
- MICRO Protocol v2.0

**Planned/Building:**
- Receptionist
- CRM Overlay
- Outbound
- TotalCostOptimizer (TCO)

---

## QUICK CHECK (Before Every Action)

1. Maps to North Star? If no → HALT
2. Have current code? If no → ASK
3. Evidence present? If no → ASK what user sees
4. Load-bearing claim? → Classify it (KNOW/THINK/GUESS/DON'T KNOW)
5. High-risk? → Extra caution + confirm before proceeding
6. Secrets exposed? → HALT + redact

---

## SSOT READ-BEFORE-WRITE — HARD RULE (NON-NEGOTIABLE)

**You may not add, remove, or materially reword any SSOT document until you have read that entire file in this session** (sequential reads/chunks through EOF count as one read). Blind patches are how a single paragraph **reverses mission, priorities, or constitutional meaning** without anyone noticing until shipped code drifts.

**In scope (treat as SSOT for this rule):**

- `docs/SSOT_NORTH_STAR.md`
- `docs/SSOT_COMPANION.md`
- `docs/NORTH_STAR_*.md`
- `docs/projects/AMENDMENT_*.md`
- `docs/projects/AMENDMENT_TEMPLATE.md`, `docs/projects/AMENDMENT_READINESS_CHECKLIST.md`, `docs/projects/INDEX.md` when they carry authoritative registry or gate text
- `docs/CONTINUITY_LOG.md`, `docs/CONTINUITY_INDEX.md`, `docs/CONTINUITY_LOG_*.md` when you are changing **policy or protocol** (not a one-line pointer-only pointer update — if unsure, read the whole lane file)

**“Material”** means anything that could change **program direction**: mission, priorities, backlog order, constitutional interpretation, legal/compliance posture, revenue chain, safety/fail-closed behavior, or “what we ship next.”

**Not exempt from reading first:** new backlog bullets, new `## Change Receipts` rows, “small” clarifications, or table rows — they stack into the same drift.

**Narrow exceptions (still require you already read that full file this session):**

- Pure typo, formatting, or broken-link fixes
- Single receipt-row append **only** when the rest of the amendment was read end-to-end in this session for alignment before you edited

**If the file is too long for one context window:** read in **order from top to bottom in multiple passes** until you have covered every line; do not edit from memory of a past chat.

**Violation:** **HALT** — do not commit SSOT changes written without a contemporaneous full read.

---

## SSOT MAINTENANCE — ATOMIC, PER-FILE, NON-NEGOTIABLE

Every source file has a `@ssot` tag in its JSDoc header pointing to its amendment.

**Rule: IMMEDIATELY after writing or editing each file — before moving to the next file — you MUST:**
1. Check that the file has a `@ssot` tag. If missing, add it now.
2. Open the amendment it points to and update `Last Updated` date + the relevant sections (Current State, Build Plan checked-off items, Change Receipts row).
3. Do NOT batch this up. Do NOT do it "at the end of the session." Do it file-by-file, in order.
4. If you created a new file with no `@ssot` tag — add one pointing to the correct amendment (or create a new amendment if this is a new domain).
5. If no amendment exists for what you built — create one using the format in `docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md` as a template.

**This is enforced by the pre-commit hook** — commits are blocked if any staged .js file's amendment was not also updated in the same diff.

**Why this rule exists:** In long sessions, batch SSOT updates at the end get forgotten or incomplete. The only reliable pattern is atomic: one file written → one amendment updated → then move on.

**@ssot tag format** (goes in the JSDoc header of every .js file):
```
* @ssot docs/projects/AMENDMENT_XX_NAME.md
```

**File-pattern → Amendment trigger table (use this FIRST):**

| File pattern | Amendment |
|---|---|
| `routes/tc-*.js`, `services/tc-*.js`, `services/glvar-*.js` | `AMENDMENT_17_TC_SERVICE.md` |
| `routes/mls-*.js` | `AMENDMENT_17_TC_SERVICE.md` |
| `services/council-*.js`, `services/token-*.js`, `services/free-tier-*.js`, `services/savings-*.js`, `services/ai-*.js`, `config/council-*.js` | `AMENDMENT_01_AI_COUNCIL.md` |
| `services/memory*.js`, `routes/conversation-*.js`, `routes/history-*.js` | `AMENDMENT_02_MEMORY_SYSTEM.md` |
| `routes/revenue*.js`, `services/billing*.js`, `routes/api-cost-savings*.js` | `AMENDMENT_03_FINANCIAL_REVENUE.md` |
| `routes/site-builder*.js`, `services/site-builder*.js`, `services/prospect*.js` | `AMENDMENT_05_SITE_BUILDER.md` |
| `routes/boldtrail*.js`, `services/boldtrail*.js`, `services/crm*.js` | `AMENDMENT_11_BOLDTRAIL_REALESTATE.md` |
| `routes/command-center*.js`, `public/overlay/command-center*` | `AMENDMENT_12_COMMAND_CENTER.md` |
| `routes/project-governance*.js`, `scripts/verify-project*`, `scripts/ssot-*`, `db/migrations/*project_governance*`, `db/migrations/*pending_adam*` | `AMENDMENT_18_PROJECT_GOVERNANCE.md` |
| `routes/twin-*.js`, `services/twin*.js` | `AMENDMENT_09_DIGITAL_TWIN.md` (or closest match) |
| Any file with no obvious match → run `node scripts/ssot-check.js --report` |

**Verify compliance:** `node scripts/ssot-check.js --all` shows every file missing its tag.

---

## WHEN STUCK

If you can't proceed:
1. State what's blocking you
2. State what you need (minimum)
3. Wait for user to provide it
4. Do NOT guess or assume
