# CLAUDE.md — LifeOS/LimitlessOS Project Instructions

---

## AGENT INBOX (check first — resolve before escalating to Adam)

**File:** `docs/AGENT_INBOX.md` · **Archive:** `docs/AGENT_INBOX_ARCHIVE.md`

Claude, CUR, Codex, and C2 **fight disagreements out here first**. Adam is not the router for AI-vs-AI technical disputes — only for **business/product decisions** in plain English. Max 5 OPEN rows; resolved → archive and remove.

**Founder packet rule:** WHAT + PASS only (`FOUNDER_PACKET_SLIM_TEMPLATE.md`). No routes, schemas, or build plans in founder packets — that is blueprint territory.

---

## OPERATOR STANDING ORDERS (Adam — do not forget)

**Push by default:** After every change we talk about, **commit → push `main` → trigger Railway deploy** without being asked again. Adam will say explicitly if he wants a slice held local (`don't push`, `hold`, `local only`). See also `.cursor/rules/operator-push-default.mdc`.

---

## READ ORDER (every session, in order)

1. `docs/AGENT_INBOX.md` — open agent questions (resolve before asking Adam)
2. `docs/AGENT_RULES.compact.md` — enforcement packet (~800 tokens, covers all operational rules)
3. `prompts/00-HIST-LEGACY-BOUNDARY.md` — STOP read (legacy vs active) — do not skip
4. `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` — which repo layer is canonical
5. `docs/projects/INDEX.md` — product registry + priority order
6. `docs/projects/[product-file].md` — the product you're building (e.g. `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`)
7. `docs/CONTINUITY_LOG.md` — latest session summary and handoff state

**Constitutional sessions only** (editing NSSOT, constitutional conflict, first onboarding):
→ Read `docs/constitution/NORTH_STAR.md` (law digest) and `docs/SSOT_NORTH_STAR.md` (full text)

---

## SESSION START CHECKLIST

Before writing a single line of code:
1. Read the files above in order
2. Read the relevant product file's `## CURRENT BP` section
3. Read last 3–5 rows of `## Change Receipts` in the owning amendment
4. Run `npm run builder:preflight` — if EXIT 1, fix before any product work
5. If Railway env names were proved in this thread → never re-ask Adam to prove them (§2.6)
6. If Adam's ask is clear → execute it or HALT with one named blocker (§2.15)

## SESSION END CHECKLIST

Before stopping (even if cut off mid-task):
1. Update the owning amendment's `## Change Receipts` (what / why / current state / next)
2. Update `## Agent Handoff Notes` with exact state + next priority
3. Update `docs/CONTINUITY_LOG.md` with one-paragraph summary
4. Mark anything in-progress with `⚠️ IN PROGRESS:` in the amendment

---

## HARD RULES (always apply — priority: NSSOT > Companion > this file > everything else)

**Zero-Degree Protocol:** Every action maps to North Star or Outcome Target. If not → HALT and ask.

**Evidence Rule:** No operational steps without evidence of user's state OR user confirmation. No "click X" unless confirmed X exists. If evidence unavailable → HALT + request minimum needed evidence.

**Honesty Standard:** Never deceive. Label uncertainty: KNOW (verified) / THINK (inference) / GUESS (low confidence) / DON'T KNOW (explicitly unknown). Silence on load-bearing facts = §2.6 violation.

**User Sovereignty:** Never manipulate or steer against user goals. No dark patterns.

**Fail-Closed:** If required info is missing → HALT, state what's missing, request minimum evidence.

**Secrets:** NEVER output API keys, tokens, passwords, private keys. If exposed → recommend rotation.

**Modes:** Step-by-step for executing/deploying/money. Brainstorm for strategy/options. If unclear → ask.

---

## ZERO WASTE AI CALL RULE

Every scheduled or background AI call MUST go through `createUsefulWorkGuard()`:

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

If prerequisites fail or work check returns 0 → skip entirely. No AI call. No tokens burned.

---

## READ-BEFORE-EDIT (non-negotiable)

You MUST read the full current file before any Edit or Write on an existing file. No exceptions.
The file on disk is source of truth — not context memory, not session summary.
Only exception: you literally just wrote the file in the same response.

---

## CODE OUTPUT RULES

1. **Full code always** — never partial code or snippets to merge; give the COMPLETE file
2. **Read first** — if you don't have the current version, READ it before writing
3. **Labels outside** — code blocks contain ONLY what to paste; all instructions/labels go outside
4. **No security vulnerabilities** — no command injection, XSS, SQL injection (OWASP top 10)
5. **No comments by default** — only add a comment when the WHY is non-obvious

---

## SERVER.JS IS A PROTECTED BOUNDARY

`server.js` is composition root only: load config → create pool/app/server → call `registerMiddleware`, `registerRoutes`, `bootDomains` → `app.listen`. Nothing else.

| What you're adding | Where it goes |
|--------------------|--------------|
| New API feature | `routes/<feature>-routes.js` + `services/<feature>.js` |
| Boot/startup logic | `startup/boot-domains.js` |
| Scheduler / cron | `startup/register-schedulers.js` |
| Config values | `config/<topic>.js` |
| DB migration | `db/migrations/<date>_<name>.sql` |
| Inline Railway/env routes | `routes/railway-managed-env-routes.js` |

If you are about to add code to `server.js` — STOP. Find the correct target file above. If none exists, create it.

---

## SSOT MAINTENANCE — ATOMIC, PER-FILE (non-negotiable)

Every .js file must have a `@ssot` JSDoc tag pointing to its amendment.
IMMEDIATELY after writing or editing each file — before moving to the next — update the amendment:
- `Last Updated` date
- Relevant sections (Current State, Build Plan, Change Receipts row)

Pre-commit hook blocks commits if a staged .js file's amendment was not also updated.

**File pattern → Amendment:**

| File pattern | Amendment |
|---|---|
| `routes/tc-*.js`, `services/tc-*.js`, `services/glvar-*.js` | `AMENDMENT_17_TC_SERVICE.md` |
| `routes/mls-*.js` | `AMENDMENT_17_TC_SERVICE.md` |
| `services/council-*.js`, `services/token-*.js`, `services/free-tier-*.js`, `services/savings-*.js`, `config/council-*.js` | `AMENDMENT_01_AI_COUNCIL.md` |
| `services/memory*.js`, `routes/conversation-*.js`, `routes/memory-*.js` | `AMENDMENT_02_MEMORY_SYSTEM.md` |
| `routes/revenue*.js`, `services/billing*.js`, `routes/api-cost-savings*.js` | `AMENDMENT_03_FINANCIAL_REVENUE.md` |
| `routes/site-builder*.js`, `services/site-builder*.js`, `services/prospect*.js` | `AMENDMENT_05_SITE_BUILDER.md` |
| `routes/boldtrail*.js`, `services/boldtrail*.js`, `services/crm*.js` | `AMENDMENT_11_BOLDTRAIL_REALESTATE.md` |
| `routes/command-center*.js`, `public/overlay/command-center*` | `AMENDMENT_12_COMMAND_CENTER.md` |
| `routes/project-governance*.js`, `scripts/verify-project*`, `db/migrations/*project_governance*` | `AMENDMENT_18_PROJECT_GOVERNANCE.md` |

**Verify compliance:** `node scripts/ssot-check.js --all`

---

## SSOT READ-BEFORE-WRITE (non-negotiable)

You may not add, remove, or materially reword any SSOT document until you have read that entire file in this session.

**In scope:** `docs/SSOT_NORTH_STAR.md`, `docs/SSOT_COMPANION.md`, `docs/NORTH_STAR_*.md`, `docs/projects/AMENDMENT_*.md`, `docs/constitution/NORTH_STAR.md`, `docs/products/*.md`, `docs/CONTINUITY_LOG.md` when changing policy.

---

## SYSTEM SELF-EXECUTION RULE

**If the system can do it → have the system do it.**

| Task | How the system does it |
|------|----------------------|
| Set Railway env vars | `POST /api/v1/railway/env/bulk` with `x-command-key` header |
| Trigger redeploy | `POST /api/v1/railway/deploy` or `npm run system:railway:redeploy` |
| DB schema changes | Write migration → commit → auto-applies on boot |
| Git commits | `services/deployment-service.js` → `commitToGitHub()` |

---

## WHEN STUCK

1. State what's blocking you
2. State what you need (minimum)
3. Wait for Adam to provide it
4. Do NOT guess or assume
