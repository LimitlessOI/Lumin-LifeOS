<!-- SYNOPSIS: CLAUDE.md — LifeOS/LimitlessOS Project Instructions -->

# CLAUDE.md — LifeOS/LimitlessOS Project Instructions

---

## AGENT INBOX (check first — resolve before escalating to Adam)

**File:** `docs/AGENT_INBOX.md` · **Archive:** `docs/AGENT_INBOX_ARCHIVE.md`

Claude, CUR, Codex, and C2 **fight disagreements out here first**. Adam is not the router for AI-vs-AI technical disputes — only for **business/product decisions** in plain English. Max 5 OPEN rows; resolved → archive and remove.

**Founder packet rule:** WHAT + PASS only (`FOUNDER_PACKET_SLIM_TEMPLATE.md`). No routes, schemas, or build plans in founder packets — that is blueprint territory.

---

## OPERATOR STANDING ORDERS (Adam — do not forget)

**Push by default:** After every shippable change — **commit → push `main` → redeploy Railway** — without being asked. Adam only says **hold** when he means it (`don't push`, `hold`, `local only`). **If commit or push fails, fix the blocker and retry until push succeeds** — do not stop and wait.

**Cursor / chat agents — system ship (founder-ratified 2026-07-15):** Do **not** open human-gated GitHub PRs and wait for Adam to Approve. Ship via the machine path: `npm run system:commit-files` → tip `POST /api/v1/lifeos/builder/execute-batch` (`commitToGitHub`) → `npm run system:railway:redeploy`. Rule: `.cursor/rules/system-ship-via-builder.mdc`. Exception only if Adam explicitly asks for a review PR.

**SO-001 — CONDUCTOR ONLY (Chair-ratified, receipt `LIFERE_COUNCIL_1783456053893`, 2026-07-03):** The AI agent (Devin/Claude/etc.) is the **conductor**, not the hands. New server-code modules under `services/`, `routes/`, `middleware/`, or `factory-staging/factory-core/` that codegen could author **MUST be built through the governed factory** (`/factory/ship-queue` `author_then_write`, cheapest tier first) so SENTRY proves them independently. Hand-authoring such a module yourself is a **DRIFT VIOLATION** — the exact failure that has burned usage. Allowed for you to hand-write: specs, blueprint `assertion_spec`s, orchestration/glue, docs, scripts/CI. **Honesty non-negotiable:** never claim a browser-agent (or any) module "works"/"shipped"/"passed" without a real **SENTRY pass receipt** or deploy receipt — an unbacked claim is a **honesty violation**, not a slip. Label KNOW / THINK / GUESS. Self-report drift the moment you notice it; do not continue.

**SO-002 — SENTRY PRE-ALPHA GATE (founder-ratified, 2026-07-03; full doctrine `docs/SENTRY_PREALPHA_DOCTRINE.md`):** No client-facing feature is "done" — and nothing reaches the founder — until SENTRY walks it as a real client and passes **both** (1) **Layer A** structural HTTP assertions (fail-closed; catches broken plumbing + parked/placeholder scrapes) AND (2) **Layer B** a real-browser human-sim walkthrough that clicks/types/tries-to-break, screenshots, and critiques the UX from the client's perspective with concrete improvements. "Endpoint 200" is NOT "done" — UX judgment is required. SENTRY tests, never builds; the builder never tests its own output. Site Builder gates: `npm run sentry:site-builder:layer-a` + `POST /api/v1/sites/prealpha/layer-b`. **Solution-mandatory (founder, 2026-07-03 — "we don't believe in impossible, like the two-minute mile"):** every SENTRY finding (failed assertion or UX friction point) is INVALID unless it carries a concrete `proposed_solution` — the file/route/spec to change, config to set, or smallest experiment to run. A flag without a fix is an incomplete report. "Impossible" is never terminal; the framing is "not solved **yet**" + the next thing to try (label KNOW/THINK/GUESS; uncertainty never justifies omitting the proposal). These proposals are the system's self-fix fuel: it converts finding+solution → governed improvement proposal (`services/builderos-improvement-loop.js`) → build → re-verify, doing the conductor's job continuously.

**SO-003 — NEVER IDLE ON TOKENS; NEVER CHEAP ON THE MOST-IMPORTANT FUNCTION (founder-ratified, 2026-07-03):** Two coupled rules. (1) **Auto-failover, never idle:** if a model errors or exhausts its tokens, the system automatically switches to another (strong) model — it must **never sit idle** because one provider ran dry. The **only** hard stop is the daily budget cap; raise it only once ROI is proven. Implemented in `defaultPlannerCallModel` (Anthropic→OpenAI→Gemini failover across present keys). (2) **No cheap AI on the most-important functions:** high-stakes reasoning — the Chair debate/counsel channel and the (future) integrity auditor — must **auto-escalate to a strong model**, and must never be served a canned/templated non-model answer in place of real reasoning. A cheap-tier or boilerplate response to a load-bearing reasoning request is a violation of this order. (Observed live: `modelRoutingForChannel` marks the `chair` channel `estimated_cost_tier: "cheap"` and `chair-lumin-unified.js` can short-circuit to a canned template via `needsSystemKnowledge`/`shouldUseDirectProgramAnswer` — the fix target is to force strong-model reasoning on these paths.)

---

## READ ORDER (every session, in order)

1. `docs/AGENT_INBOX.md` — open agent questions (resolve before asking Adam)
2. `docs/AGENT_RULES.compact.md` — enforcement packet (~800 tokens, covers all operational rules)
3. `prompts/00-HIST-LEGACY-BOUNDARY.md` — STOP read (legacy vs active) — do not skip
4. `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` — which repo layer is canonical
5. `prompts/00-LIFEOS-SERVICE-DOCTRINE.md` — service, sovereignty, epistemology (all stacks)
6. `docs/products/INDEX.md` — product registry + priority order
6. `docs/products/[product].md` — the product you're building (e.g. `docs/products/LIFEOS.md`)
7. `docs/CONTINUITY_LOG.md` — latest session summary and handoff state

**Constitutional sessions only** (editing Force of Truth / North Star SSOT, constitutional conflict, first onboarding):
→ Read **`docs/constitution/NORTH_STAR_SSOT.md`** in full (top to bottom in this session)

---

## SESSION START CHECKLIST

Before writing a single line of code:
1. Read the files above in order
2. Read the relevant product file's `## CURRENT BP` section
3. Read last 3–5 rows of `## Change Receipts` in the owning product home
4. Run `npm run builder:preflight` — if EXIT 1, fix before any product work
5. If Railway env names were proved in this thread → never re-ask Adam to prove them (§2.6)
6. If Adam's ask is clear → execute it or HALT with one named blocker (§2.15)

## SESSION END CHECKLIST

Before stopping (even if cut off mid-task):
1. Update the owning amendment's `## Change Receipts` (what / why / current state / next)
2. Update `## Agent Handoff Notes` with exact state + next priority
3. Update `docs/CONTINUITY_LOG.md` with one-paragraph summary
4. Mark anything in-progress with `⚠️ IN PROGRESS:` in the product home

---

## HARD RULES (always apply — priority: North Star SSOT > Companion > this file > everything else)

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

Every .js file must have a `@ssot` JSDoc tag pointing to its product `PRODUCT_HOME.md`.
IMMEDIATELY after writing or editing each file — before moving to the next — update the product home:
- `Last Updated` date
- Relevant sections (Current State, Build Plan, Change Receipts row)

Pre-commit hook blocks commits if a staged .js file's product home was not also updated.

**File pattern → Product home:**

| File pattern | Product home |
|---|---|
| `routes/tc-*.js`, `services/tc-*.js`, `services/glvar-*.js` | `docs/products/tc-service/PRODUCT_HOME.md` |
| `routes/mls-*.js` | `docs/products/tc-service/PRODUCT_HOME.md` |
| `services/council-*.js`, `services/token-*.js`, `services/free-tier-*.js`, `services/savings-*.js`, `config/council-*.js` | `docs/products/ai-council/PRODUCT_HOME.md` |
| `services/memory*.js`, `routes/conversation-*.js`, `routes/memory-*.js` | `docs/products/memory-system/PRODUCT_HOME.md` |
| `routes/revenue*.js`, `services/billing*.js`, `routes/api-cost-savings*.js` | `docs/products/financial-revenue/PRODUCT_HOME.md` |
| `routes/site-builder*.js`, `services/site-builder*.js`, `services/prospect*.js` | `docs/products/site-builder/PRODUCT_HOME.md` |
| `routes/boldtrail*.js`, `services/boldtrail*.js`, `services/crm*.js` | `docs/products/boldtrail/PRODUCT_HOME.md` |
| `routes/project-governance*.js`, `scripts/verify-project*`, `db/migrations/*project_governance*` | `docs/products/project-governance/PRODUCT_HOME.md` |

**Verify compliance:** `node scripts/ssot-check.js --all`

---

## SSOT READ-BEFORE-WRITE (non-negotiable)

You may not add, remove, or materially reword any SSOT document until you have read that entire file in this session.

**In scope:** `docs/constitution/NORTH_STAR_SSOT.md`, `docs/SSOT_COMPANION.md`, `docs/NORTH_STAR_*.md`, `docs/products/*/PRODUCT_HOME.md`, `docs/CONTINUITY_LOG.md` when changing policy.

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
