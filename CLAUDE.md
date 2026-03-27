# CLAUDE.md — LifeOS/LimitlessOS Project Instructions

## READ FIRST
Before ANY work, read the full documentation in `/docs/`:
- `SSOT_NORTH_STAR.md` — Constitution, mission, philosophy (THIS WINS ALL CONFLICTS)
- `SSOT_COMPANION.md` — Operations, enforcement, technical specs

If those files don't exist, ASK for them before proceeding.

---

## SYSTEM SELF-EXECUTION RULE (Read This Every Session)

**If the system can do it → have the system do it.**
**If the system can't do it yet → build the capability, then have the system do it.**

Adam is the decision-maker, not the executor. Never ask him to manually do something the system can handle.

Before asking Adam to touch any UI, CLI, or dashboard — ask: does the running Railway app have an API for this?

| Task | How the system does it |
|------|----------------------|
| Set Railway env vars | `POST /api/v1/railway/env/bulk` with `x-command-key` header |
| Trigger redeploy | `POST /api/v1/railway/deploy` |
| DB schema changes | Write migration → commit → auto-applies on boot |
| Git commits | `services/deployment-service.js` → `commitToGitHub()` |
| Read Railway vars | `GET /api/v1/railway/env` |

Only escalate to Adam when a **decision** is needed — approvals, credentials that don't exist anywhere yet, or judgment calls.

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

## SSOT MAINTENANCE — MANDATORY BEFORE EVERY TASK IS DONE

Every source file has a `@ssot` tag in its JSDoc header pointing to its amendment.

**Rule: Before marking any task complete, you MUST:**
1. Check every file you created or modified for a `@ssot` tag
2. Open that amendment file and update its `Last Updated` date and relevant sections
3. If you created a new file with no `@ssot` tag — add one pointing to the correct amendment (or create a new amendment if this is a new domain)
4. If no amendment exists for what you built — create one using the format in `docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md` as a template

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
