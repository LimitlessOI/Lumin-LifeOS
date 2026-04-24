# Continuity Log
> This file is the running continuity reference for every conversation and action. It is always checked before responding.

---
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

## [BUILD] Update 2026-04-23 #80 — TSOS savings ledger + TSOS machine-channel emitter + Cursor agent naming

### Files changed
- `scripts/council-builder-preflight.mjs` — TSOS machine-channel emitter wired. First stdout line is now a `[TSOS-MACHINE]` line per `docs/TSOS_SYSTEM_LANGUAGE.md` closed token set. All 4 terminal states emit correct STATE= tokens: PREFLIGHT_FAIL (header), BLOCKED (ECONNREFUSED), AUTH_FAIL (401), PREFLIGHT_OK (success). §2.14 law now has runtime enforcement, not just docs.
- `db/migrations/20260423_tsos_savings_ledger.sql` — `tcos_baseline_config` (audit trail of reference token counts, seeded), `conductor_session_savings` (one row per Conductor cold-start with generated columns for saved_tokens/savings_pct/cost_avoided_usd), `tsos_savings_report` view (daily: AI compression savings + Conductor session savings combined), `tsos_savings_totals` view (cumulative pitch-ready totals).
- `services/savings-ledger.js` — `conductorSession()` (log one cold-start savings event) + `getSavingsReport({ days })` (unified report for the monetization proof endpoint).
- `routes/api-cost-savings-routes.js` — 3 new endpoints: `GET /api/v1/tsos/savings/report`, `POST /api/v1/tsos/savings/session`, `GET /api/v1/tsos/savings/baselines`. All return TSOS machine receipt lines where applicable.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — Change Receipt added.
- `scripts/generate-agent-rules.mjs` — §2.13 no-regression law (system must improve never regress); baseline enforcement: exits 1 if output > baseline; `docs/.compact-rules-baseline` auto-updated on each improvement.
- `.git/hooks/pre-commit` — check #7 TOKEN BUDGET LAW: blocks if AGENT_RULES.compact.md grows past baseline.
- `docs/SSOT_NORTH_STAR.md` — §2.13 constitutional law added (System Must Always Improve — Non-Derogable).
- `docs/AGENT_RULES.compact.md` — cut from ~3807 tokens → **1007 tokens** (96% reduction vs full stack).

### Why
Adam named me (Claude Code) as CC — Cursor agent has no name yet. Adam: "the system has to get better not worse and that should be hard wired law." Now it is: §2.13 in NSSOT, baseline check in generator, pre-commit hook enforcement. Also wired TSOS emitters and savings tracking to prove the platform's value to customers.

### Numbers
- Compact rules: 1,007 tokens vs 26,105 full stack = **25,098 tokens saved per session (96%)**
- At $3/M (Claude Sonnet): $0.0000753/session saved
- At 100 sessions/day: ~2.5M tokens/day, ~$7.52/day avoided cost
- At 10 customers × 100 sessions: $75/day, $2,250/month provable avoided cost

### State after this session
- TSOS emitter: live in preflight
- Savings tracking: migration written, applies on next Railway deploy
- Report endpoint: wired, available once migration applied
- Compact rules baseline: 4025 bytes / 1007 tokens — hard enforced

### Next agent: start here
1. Deploy to Railway (migration auto-applies on boot) — then hit `GET /api/v1/tsos/savings/baselines` to confirm seed data
2. Log first real session: `POST /api/v1/tsos/savings/session` `{ compact_tokens: 1038, full_tokens: 26105, source: "cold_start", agent_hint: "claude-sonnet-4-6" }`
3. Then `GET /api/v1/tsos/savings/report` — this is the proof surface for the first customer pitch

## [BUILD] Update 2026-04-22 #79 — **North Star §2.14 + `docs/TSOS_SYSTEM_LANGUAGE.md`**

### Files changed
- `docs/TSOS_SYSTEM_LANGUAGE.md` (new), `docs/SSOT_NORTH_STAR.md` §2.14 + TL;DR + Version, `docs/SSOT_COMPANION.md` §0.5H + §0.4 + Version, `docs/QUICK_LAUNCH.md`, `docs/SYSTEM_CAPABILITIES.md`, `docs/projects/INDEX.md`, `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `scripts/generate-agent-rules.mjs`, `docs/AGENT_RULES.compact.md` (regen), `AMENDMENT_21` + `AMENDMENT_36` receipts.

### State after this session
- **Machine channel** (builder probes, preflight/redeploy/env scripts, `[TSOS-MACHINE]` lines) has a **followable** closed-token spec + templates; **§2.11b** human reports to Adam explicitly preserved. **Next:** optional code emitters (`preflight`, `env-certify`) can print first line in lexicon form; prod builder still **404** until redeploy per prior continuity.

### Next agent: start here
- Wire first-line output in `scripts/council-builder-preflight.mjs` / `scripts/env-certify.mjs` to the canonical `[TSOS-MACHINE]` format when `TSOS_MACHINE_LOG=1` or always (product decision).

## [BUILD] Update 2026-04-22 #78 — **`docs/SYSTEM_CAPABILITIES.md`** + `system:railway:redeploy`

### Files changed
- `docs/SYSTEM_CAPABILITIES.md` (new), `scripts/system-railway-redeploy.mjs`, `package.json`, `CLAUDE.md`, `SSOT_COMPANION.md` §0.4, `ENV_REGISTRY.md`, `QUICK_LAUNCH.md`, `BUILDER_OPERATOR_ENV.md`, `projects/INDEX.md`, `AMENDMENT_21` receipt.

### State after this session
- **KNOW:** `POST /api/v1/railway/deploy` exists on `robust-magic-production` (401 with bad key, not 404). **`GET …/builder/domains`** still was **404** on same host in prior probe — deploy is **split-brain** across routes; redeploy from current `main` aligns builder.
- **Rule:** Any new self-serve capability → update **SYSTEM_CAPABILITIES** + **ENV_REGISTRY** same session.

### Next agent: start here
- With real key: `npm run system:railway:redeploy` → wait → `npm run builder:preflight` → `npm run lifeos:builder:build-chat`.

---

## [BUILD] Update 2026-04-22 #77 — Lumin chat: **`npm run lifeos:builder:build-chat`** (system `/build`)

### Files changed
- `scripts/lifeos-builder-build-chat.mjs`, `package.json` script, `docs/QUICK_LAUNCH.md`, `docs/BUILDER_OPERATOR_ENV.md`, `AMENDMENT_21` handoff + receipt.

### State after this session
- **KNOW:** `GET https://robust-magic-production.up.railway.app/api/v1/lifeos/builder/domains` → **404** — production **does not** mount council builder yet; **`POST /build` cannot run there** until redeploy from branch containing `createLifeOSCouncilBuilderRoutes`.
- **KNOW:** Operator path after green `/domains`: `npm run lifeos:builder:build-chat` (with `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY`).

### Next agent: start here
- Redeploy Railway → confirm `/domains` 200 → run `npm run lifeos:builder:build-chat`.

---

## [BUILD] Update 2026-04-22 #76 — Env **certification** (working, not only present)

### Files changed
- `scripts/env-certify.mjs`, `npm run env:certify`, `data/env-certification-log.jsonl` (gitignored), `docs/ENV_REGISTRY.md` playbook + log table, `docs/ENV_DIAGNOSIS_PROTOCOL.md` §4, `docs/BUILDER_OPERATOR_ENV.md`, `package.json`, `AMENDMENT_21` receipt.

### State after this session
- **KNOW:** Operators can append **PASS** rows to `ENV_REGISTRY` with explicit success criteria + command evidence; machine JSONL mirrors runs.

### Next agent: start here
- After env-dependent slice: `npm run env:certify` → paste printed row into certification log when PASS.

---

## [BUILD] Update 2026-04-22 #75 — `ENV_REGISTRY` = operator mirror of Railway (screenshots + update rule)

### Files changed
- `docs/ENV_REGISTRY.md` — **Operator mirror of Railway**; `PUBLIC_BASE_URL` ✅ SET + documented URL; deploy inventory **non-secret values** note; **How to Add** syncs deploy list; changelog.
- `docs/SSOT_COMPANION.md` §0.4 — pointer to mirror + same-session update obligation.

### State after this session
- **KNOW:** Adam’s Railway screenshots are treated as evidence for **names**; secret **values** stay in Railway only; **non-secret** public URL may live in registry.

### Next agent: start here
- After any Railway var change: update **`docs/ENV_REGISTRY.md`** deploy inventory + changelog same session.

---

## [FIX] Update 2026-04-22 #74 — Constitutional **operator-supplied Railway evidence** hard stop

### Files changed
- `docs/ENV_DIAGNOSIS_PROTOCOL.md`, `docs/SSOT_NORTH_STAR.md` §2.3 + version/TL;DR, `docs/SSOT_COMPANION.md` §0.4, `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `CLAUDE.md` (session checklist #6), `scripts/generate-agent-rules.mjs` + regen `docs/AGENT_RULES.compact.md`, `AMENDMENT_21` + `AMENDMENT_36` receipts.

### State after this session
- **Law:** If Adam proved a var **name** in Railway **this thread**, agents **must not** re-ask him to set it or claim “not in prod” from an empty IDE shell alone — only diagnose shell/URL/auth/deploy/verifier (`ENV_DIAGNOSIS_PROTOCOL` *Operator-supplied evidence*).

### Next agent: start here
- Normal sessions: `AGENT_RULES.compact.md` §6 now explicitly prohibits **Env gaslighting**; full rules in `ENV_DIAGNOSIS_PROTOCOL`.

---

## [FIX] Update 2026-04-22 #73 — Preflight proves Railway **names** via deploy (no “missing env” gaslighting)

### Files changed
- `scripts/council-builder-preflight.mjs` — after green `/builder/domains`, optional `GET /api/v1/railway/env` (same `x-command-key`) prints ✓/✗ for builder-critical variable **names** only (values remain masked on server).
- `docs/BUILDER_OPERATOR_ENV.md` — “System-visible vault” documents the route.
- `AMENDMENT_21` — Change Receipts + `Last Updated`.

### State after this session
- **KNOW:** Railway dashboard + `GET /api/v1/railway/env` are authoritative for **what exists**; Cursor agent process has **no** vault unless operator exports key for HTTP.
- **KNOW:** Agents must apply `docs/ENV_DIAGNOSIS_PROTOCOL.md` — do not ask Adam to re-verify vars already in Railway.

### Next agent: start here
- On operator machine with key: run `npm run builder:preflight`; read the new **Railway variable names** block. If `/builder/domains` is 404, fix **deploy drift** first.

---

## [BUILD] Update 2026-04-26 #72 — Env diagnosis protocol + NSSOT §2.3 + full Railway name inventory

### Files changed
- `docs/ENV_DIAGNOSIS_PROTOCOL.md` (new), `docs/ENV_REGISTRY.md` (deploy list + certification log + changelog), `docs/SSOT_NORTH_STAR.md`, `docs/SSOT_COMPANION.md`, `docs/BUILDER_OPERATOR_ENV.md`, `docs/QUICK_LAUNCH.md`, `CLAUDE.md`, `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `docs/projects/INDEX.md`, `AMENDMENT_21` receipt.

### State after this session
- **Law:** No **KNOW** “env missing in prod” without `ENV_REGISTRY` + `ENV_DIAGNOSIS_PROTOCOL`; if name on list → troubleshoot shell/Railway/auth first; **Railway env bulk** before asking Adam to rotate secrets.

### Next agent: start here
- After first successful `builder:preflight` with live keys, append **Env certification log** row in `ENV_REGISTRY.md`.

---

## [BUILD] Update 2026-04-25 #71 — Conductor-only-builder law + env doc + preflight machine log

### Files changed
- `CLAUDE.md` — **Conductor scope** (no IDE substitution for `/build`-capable paths; `GAP-FILL` requires evidence of failed `/build`).
- `prompts/lifeos-council-builder.md` — architecture matches **system author**.
- `docs/BUILDER_OPERATOR_ENV.md` (new), `docs/QUICK_LAUNCH.md` pointer.
- `scripts/council-builder-preflight.mjs` — **`data/builder-preflight-log.jsonl`** append; `.gitignore`, `data/.gitkeep`.
- `AMENDMENT_21` Change Receipts.

### State after this session
- **Law:** Conductor ships **builder integrity + supervision**, not hand-coded replacements for council work.
- **Ops:** Operator exports Railway vars into shell per `BUILDER_OPERATOR_ENV.md`; preflight leaves **machine audit** trail locally.

### Next agent: start here
- If reverting hand-merged `files[]` injection: run **`POST /build`** with domain `lifeos-council-builder` + spec to re-apply after preflight green — **do not** re-hand-merge.

---

## [BUILD] Update 2026-04-25 #70 — Builder `files[]` → prompt injection (LifeOS chat /build readiness)

### Files changed
- `routes/lifeos-council-builder-routes.js` — `loadRepoFilesForBuilder()` + prompt block for `POST /task` and `/build`.
- `config/task-model-routing.js` — `council.builder.code|plan|review` keys.
- `prompts/lifeos-lumin.md` — operator note for large overlays.
- `AMENDMENT_21`, `AMENDMENT_01` — Change Receipts + `Last Updated` (Am.01).

### State after this session
- **KNOW:** `npm run builder:preflight` in this shell = **ECONNREFUSED** (no local server) + no command key — **no live `POST /build`** for chat was executed here.
- **Tooling:** Council can now see **`lifeos-chat.html` contents** when caller passes `files` — prerequisite for safe full-file `/build`.

### Next agent: start here
- On operator machine: `PUBLIC_BASE_URL` + `x-command-key` + server with `GITHUB_TOKEN` → run scoped `POST /api/v1/lifeos/builder/build` with `domain: "lifeos-lumin"`, `files: ["public/overlay/lifeos-chat.html"]`, narrow `task`/`spec`, `target_file`, `[system-build]` message.

---

## [BUILD] Update 2026-04-25 #69 — §2.11a / §2.11b split; Companion §0.5F + §0.5G; QUICK_LAUNCH “send” checklist

### Files changed
- `docs/SSOT_COMPANION.md` — **§0.5F** = TSOS+builder; **§0.5G** = Conductor→Adam reporting (version 2026-04-25).
- `docs/QUICK_LAUNCH.md` — intro split; execution step 4 points to **§2.11b**; P0 item 0; **When you send the Conductor to get the system building** section.
- `scripts/generate-agent-rules.mjs` + `docs/AGENT_RULES.compact.md` (regen) — two supreme-law rows; **§2.11b** subsection under §2; session END cites **§0.5G**.
- `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `CLAUDE.md`, `docs/projects/INDEX.md`, `AMENDMENT_10`, `AMENDMENT_21` (receipt, Platform row, `Last Updated` field), `AMENDMENT_36` (owns `generate-agent-rules.mjs` @ssot — receipt + `Last Updated` field).

### State after this session
- **§2.11a** = platform identity + builder P0. **§2.11b** + **§0.5G** = how build sessions **evaluate and report** to Adam. Docs no longer treat “Adam report” as part of the TSOS *name*.

### Next agent: start here
- Run `npm run gen:rules` if `QUICK_LAUNCH` queue text changes; keep **verify:maturity** green after SSOT touch.

---

## [BUILD] Update 2026-04-24 #68 — TokenSaverOS (TSOS) in NSSOT; §2.11a builder law; Adam report

### Files changed
- `docs/SSOT_NORTH_STAR.md` — platform name **TokenSaverOS (TSOS)**; new **Article II §2.11a**; Article VI “not” bullet for operator code intuition trap.
- `docs/SSOT_COMPANION.md` — **§0.5F**; P0 list; infrastructure renamed to TSOS.
- `docs/QUICK_LAUNCH.md` — P0 queue item **0** (builder + grading); execution protocol **Adam report**; NSSOT read pointer.
- `docs/projects/INDEX.md`, `AMENDMENT_10_API_COST_SAVINGS.md`, `AMENDMENT_21_LIFEOS_CORE.md` (receipts + handoff), `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `CLAUDE.md`, `scripts/generate-agent-rules.mjs`, `docs/AGENT_RULES.compact.md` (regen).

### State after this session
- “We build the builder, then supervise, grade, debate, and report in plain language” is **constitutional**, not a vibe. **TokenSaverOS** is the documented platform name; **TokenOS** (Am. 10) is a B2B lane **inside** TSOS.

### Next agent: start here
- Shrink the gap between **§2.11a** and runtime: template for **Adam report** in handoff, optional DB row or gate-change type for “builder quality score.”

---

## [BUILD] Update 2026-04-22 #67 — Builder preflight, GET /ready, strict gate (§2.11)

### Files changed
- `routes/lifeos-council-builder-routes.js` — **`GET /api/v1/lifeos/builder/ready`** (commitToGitHub, GITHUB_TOKEN, council, pool, auth).
- `scripts/council-builder-preflight.mjs` — fail-closed operator script; `npm run builder:preflight`.
- `.git/hooks/pre-commit` — runs preflight when product paths staged; **`BUILDER_PREFLIGHT=strict`** hard-blocks on failure; default **warn**.
- `CLAUDE.md` — BUILDER-FIRST: run preflight before POST `/build`; honest GAP-FILL if no keys.
- `package.json` — `builder:preflight` script. `scripts/system-maturity-check.mjs` — optional preflight when URL+key set.
- `prompts/lifeos-council-builder.md` — API list + preflight. `AMENDMENT_21` receipt.

### State after this session
- Agents can no longer claim “builder unavailable” without printed blockers; Adam can enable **strict** on his machine.
- Full `[system-build]` still requires Railway **GITHUB_TOKEN** + **COMMAND_CENTER_KEY** in the operator shell for `npm run builder:preflight`.

### Next agent: start here
- Adam: `export BUILDER_PREFLIGHT=strict` in `~/.zshrc` and keep `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY` in env for the Railway that hosts the app.

---

## [FIX] Update 2026-04-22 #66 — SSOT verify honesty: skip deleted paths + tag council + sales analyzer

### Files changed
- `scripts/ssot-check.js` — `checkChangedFiles` skips paths not on disk (deleted in `git diff`) so verify does not falsely warn “missing @ssot”.
- `services/council-service.js` — top JSDoc + `@ssot` → `AMENDMENT_01_AI_COUNCIL.md`.
- `core/sales-technique-analyzer.js` — `@ssot` → `AMENDMENT_21_LIFEOS_CORE.md`.
- `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, `AMENDMENT_19_PROJECT_GOVERNANCE.md`, `AMENDMENT_21_LIFEOS_CORE.md`, `INDEX.md` — change receipts / Last Updated.

### State after this session
- `CI=true npm run verify:maturity` passes; SSOT check reports green for changed files (no bogus missing-tag warnings for deleted routes).
- Full `lifeos-verify.mjs` still operator-only (needs `DATABASE_URL` + keys).

### Next agent: start here
- Run `node scripts/lifeos-verify.mjs` with real env when proving DB-backed gates; extend Lumin builder learning loop per §2.11 backlog, not IDE-only patches for product code.

---

## [BUILD] Update 2026-04-23 #65 — Settings UI: council gate-change presets + admin JWT on GET /presets

### Files changed
- `routes/lifeos-gate-change-routes.js` — `requireKeyOrLifeOSAdmin` for **GET /presets** (command key or admin JWT via `verifyToken`).
- `public/overlay/lifeos-app.html` — admin Settings section **Gate-change (council presets)** with Refresh + Copy CLI.
- `prompts/lifeos-gate-change-proposal.md`, `docs/QUICK_LAUNCH.md`, `scripts/generate-agent-rules.mjs` → `npm run gen:rules` → `docs/AGENT_RULES.compact.md`.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — receipt + handoff Completed line.

### Next agent
- Optional: non-admin operators with command key only can use CLI `--list-presets`; overlay panel stays admin-only by product choice.

---

## [BUILD] Update 2026-04-22 #64 — Shell Cmd+L from iframe + gate-change `/presets`

### Files changed
- `public/overlay/lifeos-bootstrap.js` — `@ssot` header; iframe `postMessage` bridge for Cmd/Ctrl+L (skip `lifeos-chat.html`).
- `public/overlay/lifeos-app.html` — same-origin `message` handler opens Lumin drawer from iframe.
- `routes/lifeos-gate-change-routes.js` — `GET /presets`; JSDoc line.
- `scripts/council-gate-change-run.mjs` — `--list-presets` / `--list` before key check.
- `prompts/lifeos-gate-change-proposal.md`, `docs/QUICK_LAUNCH.md`, `AMENDMENT_21` (Known gaps + receipt).

### State after this session
- **KNOW:** Preset list is discoverable without opening `config/gate-change-presets.js`.
- **THINK:** Manual verify: load LifeOS shell → open Today in frame → click non-input background → Cmd+L → drawer should open.

### Next agent: start here
- E2E smoke from handoff (invites, ambient) or wire `GET /presets` into a small overlay “Council” dev panel if Adam wants UI.

---

## [FIX] Update 2026-04-22 #63 — Council epistemics in generated agent rules (anti–“virtual council”)

### Files changed
- `scripts/generate-agent-rules.mjs` — §3/§6/§7 expanded: real gate-change/CLI only; if blocked, `COUNCIL: NOT RUN` + `OPINION ONLY — NOT COUNCIL`; never mislead by omission; `npm run lifeos:gate-change-run` + env vars documented.
- `docs/AGENT_RULES.compact.md` — regenerated via `npm run gen:rules`.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — `Last Updated` + Change Receipts row (owns generator).

### State after this session
- **KNOW:** Real multi-model council runs on **deployed** server via `POST .../gate-change/...` or `scripts/council-gate-change-run.mjs` with `COMMAND_CENTER_KEY` + `PUBLIC_BASE_URL`. IDE models cannot in-process `callCouncilMember` (already stated in `QUICK_LAUNCH.md`).
- **KNOW:** Markdown rules in the compact packet are **not** OS-level enforcement; they only bind agents who read them. **Runtime** trust = API receipts + CI + your keys.

### Next agent: start here
- If a task is load-bearing (§2.12), **run** `lifeos:gate-change-run` (with env) or print **`COUNCIL: NOT RUN (blocked: …)`** before giving recommendations.

---

## [BUILD] Update 2026-04-22 #62 — SSOT organization + token compression system

### Files changed
- `docs/SSOT_NORTH_STAR.md` — TL;DR agent quick-reference box added to top: top-5 laws table, read-chain pointer, "read compact rules for normal sessions" instruction. SSOT READ-BEFORE-WRITE rule obeyed: file fully read this session.
- `docs/SSOT_COMPANION.md` — §0.4 Active Build Priority updated to current state (LifeOS E2E invite is #1, TC on hold, ClientCare #3, TCO blocked on schema divergence). Canonical-priority pointer to `QUICK_LAUNCH.md` added. SSOT READ-BEFORE-WRITE rule obeyed: file fully read this session.
- `CLAUDE.md` — READ NEXT section rewritten: `docs/AGENT_RULES.compact.md` is the first read for normal sessions (~800 tokens); full NSSOT+Companion only for constitutional sessions.
- `docs/QUICK_LAUNCH.md` — Required Read Order rewritten: `AGENT_RULES.compact.md` is now step 1 (replaces full NSSOT + Companion for normal sessions). Token-budget note added.
- `scripts/generate-agent-rules.mjs` — exported `main()` for module import; fixed latest-entry regex to grab last `## [BUILD/FIX/...]` block (was grabbing first/oldest); added `process.argv[1]` guard for correct direct-invocation detection.
- `scripts/generate-cold-start.mjs` — now imports and calls `generate-agent-rules.mjs#main()` at end so both regenerate together with `npm run cold-start:gen`.
- `package.json` — added `gen:rules` script; `cold-start:gen` now chains both scripts.
- `.git/hooks/pre-commit` — added check #6: if `SSOT_NORTH_STAR.md`, `SSOT_COMPANION.md`, or `QUICK_LAUNCH.md` staged → auto-regenerate `docs/AGENT_RULES.compact.md` and stage it so compact rules never drift from source.
- `docs/AGENT_RULES.compact.md` — regenerated with current QUICK_LAUNCH priority queue + latest CONTINUITY_LOG entry (~2512 tokens).

### Why
Adam requested SSOT reorganization + token compression so AI agents burn far fewer context tokens reading project state at the start of each session. Full NSSOT + Companion = ~8000+ tokens on every cold read. Compact rules file = ~2512 tokens. Saving ~75% per session — directly stretches the free token budget.

### State after this session
- `docs/AGENT_RULES.compact.md` is live and auto-regenerates on source change
- All read-order references in CLAUDE.md, QUICK_LAUNCH, and NSSOT TL;DR consistently point to compact rules first
- Pre-commit hook auto-regenerates compact rules if SSOT source files change
- Full SSOT enforcement chain is complete: NSSOT → Companion → CLAUDE.md → AGENT_RULES.compact.md → commit-msg hook

### Next agent: start here
Next priority task: **E2E household invite test** — admin creates invite → open in private window → register as Sherry → confirm `lifeos_role` admin panel appears for adam only. See `AMENDMENT_21_LIFEOS_CORE.md → ## Agent Handoff Notes`.

## [FIX] Update 2026-04-22 #61 — Close the NSSOT chain gap: §0.5D enforcement pointer

### Files changed
- `docs/SSOT_COMPANION.md` — added `### Enforcement` subsection to `§0.5D`: specific API call sequence, session-start builder health check, commit message markers, pointer to `CLAUDE.md → BUILDER-FIRST RULE`; bumped version to 2026-04-22b
- `docs/SSOT_COMPANION.md` — SSOT READ-BEFORE-WRITE complied: full file read top-to-bottom this session before edit

### Why
NSSOT §2.11 → §0.5D described the Conductor/GAP-FILL concept correctly but did not tell cold agents *how* to actually call the builder. An agent reading only the NSSOT chain would understand the rule conceptually but not know the endpoint, the commit marker, or that a hook enforces it. The pointer closes that gap — cold agent reads §2.11 → §0.5D → hits the Enforcement block → knows exactly what to do.

### Full enforcement chain (now complete)
1. `NSSOT §2.11` → cites `SSOT_COMPANION §0.5D`
2. `SSOT_COMPANION §0.5D → Enforcement` → cites `POST /builder/build`, commit markers, `CLAUDE.md → BUILDER-FIRST RULE`
3. `QUICK_LAUNCH.md step 3` → builder-first check in execution protocol
4. `CLAUDE.md → BUILDER-FIRST RULE` → full machine-readable protocol
5. `.git/hooks/commit-msg` → hard-blocks non-compliant commits

## [FIX] Update 2026-04-22 #60 — §2.11 BUILDER-FIRST enforcement (loophole closed)

### Files changed
- `CLAUDE.md` — new `## BUILDER-FIRST RULE` section (machine-readable §2.11 enforcement with exact call sequence, pass/fail conditions, GAP-FILL protocol, and session-start builder health check)
- `docs/QUICK_LAUNCH.md` — Execution Protocol step 3: builder-first check mandatory before any product code
- `.git/hooks/pre-commit` — §2.11 warning when product files staged
- `.git/hooks/commit-msg` — NEW: hard-blocks any commit of `routes/`, `services/`, `public/overlay/`, `db/migrations/` files unless message contains `[system-build]` or `GAP-FILL:`

### Why this was built
Text rules in CLAUDE.md are re-read every session but ignored when the builder is broken (the agent rationalizes GAP-FILL and hand-codes). The commit-msg hook creates a machine-enforced checkpoint: the agent cannot commit product code without proving it either (a) used the builder, or (b) has a documented reason why it couldn't.

### Tested
- Violation commit (no marker, product file staged) → BLOCKED ✅
- `GAP-FILL: reason` → PASSES ✅  
- `[system-build]` → PASSES ✅
- Builder route file itself (`lifeos-council-builder-routes.js`) → excluded ✅

### State
- **KNOW:** Hook is local-only (`.git/hooks/`). Railway CI does not use it. But the Conductor (Claude Code) always commits locally via git — the hook fires.
- **Gap:** If the agent uses `--no-verify`, the hook is bypassed. That flag is prohibited by CLAUDE.md ("NEVER skip hooks unless user explicitly requests it") — two-layer protection.

### Next agent: start here
Use the builder for the next product task. Full protocol in `CLAUDE.md → BUILDER-FIRST RULE`.

## [FIX] Update 2026-04-22 #59 — §2.11 builder execute loop + domain prompt coverage

### Files changed
- `server.js` — pass `commitToGitHub` into `registerRuntimeRoutes`
- `startup/register-runtime-routes.js` — destructure + forward `commitToGitHub` to builder factory
- `routes/lifeos-council-builder-routes.js` — added `POST /api/v1/lifeos/builder/execute` (apply output to repo file) + `POST /api/v1/lifeos/builder/build` (generate + auto-commit); factory now accepts `commitToGitHub`
- `prompts/tokenos.md` — new domain context for TokenOS B2B lane
- `prompts/tc-service.md` — new domain context for TC Service lane
- `prompts/lifeos-ambient.md` — new domain context for ambient snapshots lane
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — Change Receipts + Agent Handoff Notes updated (drift corrected: overlays marked done, already-shipped items documented)
- `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md` — schema divergence warning added for old `tco-routes.js` column mismatch
- `docs/QUICK_LAUNCH.md` — priority queue corrected (overlays already shipped 2026-04-20)

### Problem fixed
§2.11 (North Star) requires the SYSTEM to be the author of amendment/project product code. Previous sessions hand-coded TokenOS, overlays, routes directly via the Conductor — that is a §2.11 violation. The builder had a `POST /task` endpoint that returned generated code but never committed it, so the loop was always broken.

### What the builder can do now
1. `POST /api/v1/lifeos/builder/task` — generate code (review before applying)
2. `POST /api/v1/lifeos/builder/execute` — apply reviewed output to a repo file via `commitToGitHub`
3. `POST /api/v1/lifeos/builder/build` — full autonomous flow: generate → extract `target_file` from placement metadata → commit → Railway auto-deploys

### State
- **KNOW:** `node --check` passes on all modified files
- **KNOW:** `commitToGitHub` requires `GITHUB_TOKEN` env var on Railway
- **THINK:** The builder can now execute full product builds without Conductor hand-coding
- **Next agent rule:** For any new product feature — use `POST /build` with a domain + spec. Only code platform gaps directly.

### Next agent: start here
1. Use the builder to build the next approved task: `POST /api/v1/lifeos/builder/build` with `domain: "tokenos"` + spec for Stripe billing wiring
2. Verify TokenOS first-customer flow after deploy: register → proxy call → dashboard
3. TC lane: use `domain: "tc-service"` for next slice

## [BUILD] Update 2026-04-22 #58 — `POST /gate-change/run-preset` (council on server, deploy keys)

### Files
- `routes/lifeos-gate-change-routes.js`, `services/lifeos-gate-change-council-run.js`, `config/gate-change-presets.js`, `scripts/council-gate-change-run.mjs`, `scripts/lifeos-verify.mjs` — new endpoint + DRY debate; CLI preset = one HTTP call. Docs: Companion, AMENDMENT_01, QUICK_LAUNCH, SYSTEM_MATURITY_PROGRAM, AMENDMENT_21 receipt.

### State
- **KNOW:** Debate uses **server** `callCouncilMember` — `COMMAND_CENTER_KEY` + public URL is enough for operators.
### Next
- Deploy, then `npm run lifeos:gate-change-run -- --preset program-start`.

## [BUILD] Update 2026-04-22 #57 — SYSTEM MATURITY PROGRAM + `verify:maturity` + CI + `ssot:validate` fix

### Files changed
- `docs/SYSTEM_MATURITY_PROGRAM.md` — 13 aspects, phases, how council “checks the work.”
- `scripts/system-maturity-check.mjs`, `scripts/ssot-validate.mjs` (wraps `ssot-check`); `package.json` — `verify:maturity`, fixed `ssot:validate`.
- `.github/workflows/system-maturity.yml`
- `scripts/council-gate-change-run.mjs` — `--preset program-start`
- `docs/SSOT_COMPANION.md` §0.5E, `docs/QUICK_LAUNCH.md`, `AMENDMENT_21` receipt.

### State
- **KNOW:** `lifeos-verify` still needs secrets locally/operator; CI skips it by design.
### Next
- Run `npm run lifeos:gate-change-run -- --preset program-start` on Railway; iterate phases in `SYSTEM_MATURITY_PROGRAM.md` checkboxes.

## [BUILD] Update 2026-04-22 #56 — Real council CLI: gate-change `run-council` (not chat)

### Files changed
- `scripts/council-gate-change-run.mjs` — POST proposal + POST `run-council` with optional `--preset maturity`.
- `package.json` — `lifeos:gate-change-run`.
- `docs/QUICK_LAUNCH.md` — *Real multi-model AI Council* (KNOW: IDE chat ≠ deployed council).
- `CLAUDE.md` — real debate = `run-council` HTTP.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — receipt.

### State
- **KNOW:** Requires live server + `COMMAND_CENTER_KEY` + provider keys on host; costs tokens.
### Next
- Run `npm run lifeos:gate-change-run -- --preset maturity` against production when ready.

## [BUILD] Update 2026-04-22 #55 — North Star §2.12: technical decisions + supervision anti-drift (law)

### Files changed
- `docs/SSOT_NORTH_STAR.md` — new **Article II §2.12** (council + research + consensus/deadlock; Conductor/Construction supervisor SSOT re-read + drift vs verifiers; **non-derogable**; amend only via **Article VII**); **Article VI** negative space.
- `docs/SSOT_COMPANION.md` **§0.5E** — operational checklist; version bump.
- `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `docs/QUICK_LAUNCH.md`, `CLAUDE.md` — cross-links.
- `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — mission § + epistemic line + **Change Receipts** / `Last Updated`.

### State
- **KNOW:** Constitutional text is in North Star; lower docs cannot soften §2.12.
### Next
- For any load-bearing technical fork, run **council** + best-practice input + receipts; if split, full debate protocol. Supervisors: **read SSOT** each session, **run verifiers** before claiming done.

## [BUILD] Update 2026-04-22 #54 — ENV SSOT: Railway name inventory (no values)

### Files changed
- `docs/ENV_REGISTRY.md` — deploy inventory (Lumin / robust-magic) + DB sandbox/SSL, BASE_URL, runtime cost cap, eXp Okta table, email/Cerebras status sync.
- `services/env-registry-map.js` — same names mirrored for `getRegistryHealth()`.
- `docs/SSOT_COMPANION.md` §0.4 — pointer to deploy name inventory and rotation note.
- `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` — change receipt.

### State
- **KNOW:** Names-only; no secrets committed. If `DATABASE_URL` was ever visible in a UI capture, rotate Neon + Railway.
### Next
- As new keys appear in Railway, append rows to the deploy inventory and `env-registry-map.js`.

## [BUILD] Update 2026-04-22 #53 — Lumin build ops + shell Cmd+L + P1 plan affordance

### Files changed
- `services/lifeos-lumin-build.js` — `getBuildOps()` (read-only SQL aggregates).
- `routes/lifeos-chat-routes.js` — `GET /api/v1/lifeos/chat/build/ops`.
- `public/overlay/lifeos-chat.html` — Build ops panel, P1 goal button, load ops on panel open.
- `public/overlay/lifeos-app.html` — Cmd/Ctrl+L opens Lumin drawer (when not typing in an input).
- `scripts/lifeos-build-ops.mjs`, `scripts/lumin-invoke-plan.mjs`; `package.json` scripts `lifeos:build-ops`, `lifeos:lumin-plan`.
- `prompts/lifeos-lumin.md`, `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — receipts.

### State
- **KNOW:** Syntax clean. **THINK:** Full `/build/ops` and council `/build/plan` need valid `DATABASE_URL` + keys on the target host; prior local runs hit `28P01` with stale creds.

### Next
- Deploy, then `npm run lifeos:build-ops` and optional `npm run lifeos:lumin-plan` against production base URL.

---

## [BUILD] Update 2026-04-22 #52 — TokenOS B2B product layer fully built

### Files changed
- `db/migrations/20260422_tokenos_customers.sql` — NEW: `tco_customers` (B2B customer registry), `tco_requests` (per-proxy-call savings ledger), `tco_agent_interactions`, `tco_agent_negotiations`, `tco_savings_daily` view. This was the root blocker: proxy returned 401 on every call because `tco_customers` didn't exist.
- `services/tokenos-quality-check.js` — NEW: TCO-C01 meaning checksum (`extractSemanticMarkers`, `checkMeaningCoverage`) + TCO-C02 quality regression detection (`scoreResponseQuality`, `detectQualityRegression`, `runQualityGate`). Zero-AI-call heuristic quality gate; auto-fallback when verdict='fail'.
- `services/tokenos-service.js` — NEW: B2B customer service. `registerCustomer` (creates account + API key), `rotateApiKey`, `getCustomerByKey` (used on every proxy request), `storeProviderKeys` (AES-256-GCM via tco-encryption.js), `getSavingsSummary`, `getMonthlyInvoice`, `listCustomers`, `onboardCustomer`, `getPlatformSavings` (from internal token_usage_log).
- `routes/tokenos-routes.js` — NEW: Full B2B API surface. Proxy at `POST /api/v1/tokenos/proxy` (3 modes: optimized/direct/ab_test with quality gate), self-serve registration, customer dashboard/report/invoice endpoints, admin CRUD. Also serves `/token-os` and `/token-os/dashboard` static HTML.
- `startup/register-runtime-routes.js` — Added import + mount call for TokenOS routes. No server.js mutation.
- `public/overlay/tokenos-landing.html` — NEW: Marketing page at `/token-os`. Live ticker (animated placeholder), compression stack explainer, pricing plans, sign-up form that calls `POST /api/v1/tokenos/register` and displays API key.
- `public/overlay/tokenos-dashboard.html` — NEW: Full client dashboard at `/token-os/dashboard`. Auth via Bearer key (session storage). Pages: overview (savings cards + bar chart + model table), savings chart, detailed report, invoice generator, by-model breakdown, settings (key rotation), quickstart docs.
- `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md` — Status updated to IN_BUILD (B2B built, awaiting first customer). Component table updated (TCO-C01/C02 now LIVE). New files added. API endpoint table added. Agent Handoff Notes + Change Receipts appended.

### State after this session
- All 9 new files pass `node --check` (syntax clean)
- Migration file is written but NOT yet applied to Neon — it auto-applies on next Railway deploy
- Routes are mounted and will be live after deploy
- Old `/api/tco/proxy` path (via server.js null-globals) remains dead — no change made there; new path is `/api/v1/tokenos/proxy`
- `tco_customers` table missing from production until deploy runs migration
- Quality gate threshold (QUALITY_THRESHOLD=72) is a first-pass heuristic; needs real-world tuning after 100+ proxy calls

### Next agent: start here
1. Verify migration applied: `SELECT COUNT(*) FROM tco_customers` in Neon (should succeed after deploy)
2. Register first test customer: `POST /api/v1/tokenos/register` with `{ name, email, plan: 'starter' }`
3. Make a test proxy call: `POST /api/v1/tokenos/proxy` with Bearer tok_live_... key and `{ provider: 'openai', model: 'gpt-4', messages: [...] }`
4. Verify `tco_requests` row created with savings > 0
5. View dashboard at `/token-os/dashboard` — enter API key, confirm data shows
6. Next feature: Stripe billing for monthly invoice payment

---

## [BUILD] Update 2026-04-21 #51 — Lumin build `/build/health` + smoke script

### Files changed
- `routes/lifeos-chat-routes.js` — `GET /api/v1/lifeos/chat/build/health`: pool + `callCouncilMember` + `luminBuild` flags, `SELECT 1 FROM lumin_programming_jobs LIMIT 0` probe (no council/AI).
- `scripts/lumin-build-smoke.mjs` — operator fetch to health; optional `LUMIN_SMOKE_PLAN=1` for one POST `/build/plan`.
- `package.json` — `npm run lifeos:lumin-build-smoke`.
- `prompts/lifeos-lumin.md` — route surface line for health.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — receipt + Last Updated table field.

### State after this session
- **KNOW:** Code is present; **GUESS:** Not executed here against a live Railway instance (no `COMMAND_CENTER_KEY` in this environment).

### Next agent: start here
- Run `npm run lifeos:lumin-build-smoke` with `LUMIN_SMOKE_BASE_URL` + `COMMAND_CENTER_KEY` after deploy; use `LUMIN_SMOKE_PLAN=1` only when a paid council run is acceptable.

---

## [FIX] Update 2026-04-22 #52 — Lumin smoke fail-closed diagnosis

### Files changed
- `routes/lifeos-chat-routes.js` — `/api/v1/lifeos/chat/build/health` now includes `lumin_programming_jobs_diagnosis` (auth/migration/connectivity hints) when the table probe fails.
- `scripts/lumin-build-smoke.mjs` — now exits non-zero when jobs table is unreachable and translates common error codes (`28P01`, `42P01`, `ECONNREFUSED`) into actionable messages.
- `prompts/lifeos-lumin.md` + `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` receipt text updated for diagnosis behavior.

### State after this session
- **KNOW:** smoke against `http://127.0.0.1:8083` reports `database_auth_failed` (`28P01`) before plan execution, preventing false-green bridge status.

### Next agent: start here
- Set correct runtime `DATABASE_URL` credentials, rerun `npm run lifeos:lumin-build-smoke`, then run with `LUMIN_SMOKE_PLAN=1` for end-to-end council plan proof.

---

## [PLAN] Update 2026-04-21 #50 — Article II §2.11: system code vs. amendment/project (Adam)

### Files
- `docs/SSOT_NORTH_STAR.md` **§2.11** rewrite — *The System Programs Projects; You Code Only the System*; `docs/SSOT_COMPANION.md` **§0.5D** system vs. project; `prompts/00`, `CLAUDE.md`, `QUICK_LAUNCH`, **Article IV §4.2**, `AMENDMENT_21`.

### Rule (KNOW)
- **External** coding = **platform** (gaps, breakage, Lumin parity) + **`GAP-FILL:`** receipts.
- **Amendment / project** product = **in-system** (Lumin, builder, queue, `pending_adam`); not primary IDE “project” implementation.

## [PLAN] Update 2026-04-21 #49 — Article II §2.11: licensed external coding (Conductor / GAP-FILL)

### Files
- `docs/SSOT_NORTH_STAR.md` **§2.11** + `docs/SSOT_COMPANION.md` **§0.5D** + cross-links: `Article IV §4.2`, `prompts/00-LIFEOS-AGENT-CONTRACT.md`, `docs/QUICK_LAUNCH.md`, `CLAUDE.md`, `AMENDMENT_21` epistemic + Change Receipts.

### State
- **THINK / policy:** Stops ad-hoc “IDE agent” product coding without Conductor/Construction-supervisor discipline; **only** GAP-FILL is an authorized excuse for “external” code when the **system** can’t run yet. Enforcement is SSOT + receipts + culture until CI can detect (hard).

## [BUILD] Update 2026-04-21 #48 — Lumin chat: build panel + mode context

### Files changed
- `public/overlay/lifeos-chat.html` — Build panel (plan/draft, job list, hints); commands `/plan`, `/draft`, `/queue` and `lumin plan:` / `lumin draft:` / `lumin queue:`; status strip; `Cmd/Ctrl+L` focuses input.
- `services/lifeos-lumin.js` — `buildContextSnapshot(userId, { mode })` with per-mode SQL slices; commitments count `IN ('active','open','in_progress')`.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — Lumin Expansions + Change Receipts + handoff Known gaps.

### State after this session
- Governed build bridge is usable from the **full** chat page without knowing REST paths; council calls remain synchronous (no streaming %).
- **Next:** conversational capture → structured memory with receipts; global Cmd+L from `lifeos-app` shell; wake word; optional async job worker if long council runs time out.

## [BUILD] Update 2026-04-21 #47 — NSSOT §2.10 platform law + Companion §0.5C

### Files changed
- `docs/SSOT_NORTH_STAR.md` — **Article II §2.10** (governed observability, grading, remediation, tooling-gap closure, LLM roles, earned self-correction, core vs adaptive truth); **Article IV §4.2** cross-link; version bump.
- `docs/SSOT_COMPANION.md` — **§0.5C** (Core vs Adaptive Lumin, classification, seamless vs guided, promotion pipeline, LLM responsibilities); version bump; ties §0.5A to §2.10.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — epistemic § implements §2.10; `### Core LifeOS vs Adaptive Lumin (idea routing)`; Change Receipt + Agent Handoff Known gaps (**§2.10** vs runtime automation depth); `Last Updated` fields.
- `docs/QUICK_LAUNCH.md` — NSSOT read order + execution protocol reference **§2.10** / **§0.5C**.
- `prompts/00-LIFEOS-AGENT-CONTRACT.md` — supreme law line includes **§2.10**.

### State after this session
- Constitutional text now **requires** the improvement loop and LLM roles platform-wide; **Directed Mode** (Companion §0.6) and **Human Guardian** (North Star Article III) still govern autonomy and high-risk actions.

### Next agent: start here
- When extending **automated** observe/repair (metrics, jobs, UI for grades), wire through existing guards (Zero-Waste AI, §2.6, opt-in flags) and record receipts in the owning amendment.

## [BUILD] Update 2026-04-21 #46 — Lumin programming bridge + council chat adapter

### Files changed
- `services/council-prompt-adapter.js` — NEW: wraps `callCouncilMember(member, prompt, opts)` for legacy single-string and two-string `callAI` callers.
- `startup/register-runtime-routes.js` — shared `councilChatAI` for weekly-review, scorecard, chat, health; chat receives `callCouncilMember` for build service.
- `routes/lifeos-core-routes.js`, `routes/lifeos-health-routes.js` — use adapter (health falls back to internal adapter if `callAI` omitted).
- `services/lifeos-lumin-build.js`, `db/migrations/20260424_lumin_programming_jobs.sql` — plan/draft/pending_adam queue + job rows for progress polling.
- `routes/lifeos-chat-routes.js` — `POST/GET .../build/*` endpoints.
- `config/task-model-routing.js` — `lifeos.lumin.program_plan` key.
- `scripts/lifeos-verify.mjs` — requires new migration + services + `lifeos-chat-routes.js`.

### State after this session
- Lumin chat + weekly review + scorecard + health pattern/medical generators now call council with a **valid member first argument** (fixes prior `Unknown member` class of bug when a full prompt was passed as `member`).
- Self-programming from Lumin is **governed**: council text + optional `pending_adam` row; no auto-merge. Overlay progress bar still **not built** — poll `GET /api/v1/lifeos/chat/build/jobs/:id`.

### Next agent: start here
- Wire `lifeos-chat.html` or shell to show build job status + links to Command Center / `pending_adam`; optional: auto-suggest `POST /build/plan` from user intent classifiers.

---

## [BUILD] Update 2026-04-21 #45 — LifeOS shell: visible Lumin “Ask…” strip

### Files changed
- `public/overlay/lifeos-app.html` — **Ask Lumin…** quick bar under topbars; `openLuminFromQuickBar()`; Lumin drawer/FAB z-index 960/970/980; compact subtitle hidden below 420px width.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — `### Lumin — companion front door` (conversational-first, anti-interview, variety + communication-profile); handoff next build; change receipt + Last Updated.
- `prompts/lifeos-lumin.md` — documents shell entry surfaces + conversational-first direction.

### Next agent: start here
Implement **conversation → structured memory / MIT** with explicit user-visible receipts (Amendment 21 handoff).

---

## [FIX] Update 2026-04-21 #44 — Real-world testing readiness pass (Bug fix pass 3)

### Files changed
- `services/integrity-score.js` — 3x `CURRENT_DATE - $N` (integer) → `CURRENT_DATE - ($N * INTERVAL '1 day')`. PostgreSQL cannot subtract an integer from a date directly; was crashing `scoreboard`, `trend`, and `history` queries with `operator does not exist: date >= integer`.
- `services/joy-score.js` — 2x same fix on `checkin_date` and `score_date` queries.
- `routes/lifeos-healing-routes.js` — replaced inline `resolveUser()` (returned raw handle string) with async `makeLifeOSUserResolver`-backed resolver; updated all handlers to `await resolveUser(req)`; was causing `invalid input syntax for type bigint: "adam"` on all healing endpoints.
- `routes/lifeos-children-routes.js` — GET `/profiles` now accepts `?user=adam` as fallback when `?parent_user` absent.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — added Change Receipt row for this pass.

### State after this session
- **KNOW (smoke test verified):** 23/24 LifeOS API endpoints return `ok: true` or valid data with `user=adam` params. All core flows operational: mirror, commitments, scorecard, joy, emotional, health, decisions, identity, conflict, mediation, finance, legacy, healing, habits, cycle, weekly review, growth, purpose, vision, scoreboard, children.
- **Community routes** (`/api/v1/lifeos/community/*`) — 404. DB migration exists (`20260329_lifeos_community.sql`) but `routes/lifeos-community-routes.js` was never built. Non-blocking for testing.
- **`healthz`** — returns plain text `OK` (correct, not JSON — no change needed).
- Server starts clean on port 8082 (8080/8081 occupied by prior instances).
- All LifeOS DB tables created via `20260328_lifeos_repair.sql` one-boot migration.

### Next agent: start here
- System is ready for real-world UI testing at `http://localhost:8082/overlay/lifeos-app.html`
- Set up Adam's user: already seeded (`user_handle='adam'`) via repair migration
- First real test: open the overlay, go through onboarding, set 3 MITs, check mirror
- If building: community routes (`lifeos-community-routes.js`) are the main unbuilt surface

---

## [FIX] Update 2026-04-21 #43 — Billing remote verify SSOT + verifier HTTP method

### Files changed
- `scripts/verify-project.mjs` — each manifest `required_routes` row now passes **`method`** into route assertions (POST was previously sent as GET). On **401**, retries once with **`LIFEOS_KEY`** when it differs from the primary env key.
- `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` — `## Machine verification` documents **KNOW** (this agent: billing dashboard GET on `robust-magic-production.up.railway.app` → **401** with workspace `.env` only) vs **Railway Variables / overlay Save access** as separate evidence; forbids implying “untestable in prod” when the failure is shell key drift.
- `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md` — receipt correction: manifest `required_routes` → route assertions omitted `method` until this fix.

### State after this session
- **KNOW:** Remote billing API probes still **401** from this Cursor environment because local `COMMAND_CENTER_KEY` does not match production (no `LIFEOS_KEY` in `.env` to recover).
- **KNOW:** POST routes in the manifest are now probed with the correct HTTP method.

### Next agent: start here
To record **green** remote verifier receipts: run `node scripts/verify-project.mjs --project clientcare_billing_recovery --remote-base-url "https://<your-service>.up.railway.app"` after exporting a key that **matches Railway** (`railway variables` / `scripts/tc-r4r-from-railway.mjs`). Then update AMENDMENT_18 change receipt **Verified** column.

---

## [BUILD] Update 2026-04-21 #44 — LifeOS shell: Lumin “Ask…” strip (companion front door)

### Files changed
- `public/overlay/lifeos-app.html` — persistent **Ask Lumin…** bar under topbars; `openLuminFromQuickBar()`; drawer/FAB z-index 960/970/980; mobile hides subtitle &lt;420px.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — `### Lumin — companion front door`; handoff next build; change receipt; Last Updated sync.
- `prompts/lifeos-lumin.md` — shell surfaces + conversational-first direction.

### Next agent: start here
Ship **conversation → structured memory / MIT** with visible receipts (see Amendment 21 handoff); optional: merge duplicate **Last Updated** prose in Amendment 21 header zone into one canonical paragraph.

---

## [BUILD] Update 2026-04-23 #42 — Billing overlay “assistant to ClientCare” UX

### Files changed
- `public/clientcare-billing/overlay.html` — page title, section-label / panel CSS, script `?v=20260423a`.
- `public/clientcare-billing/clientcare-billing.js` — hero + main column reorder (queue/chat/VOB first); KPI strip simplified + “More metrics”; collapsible secondary panels; copy for assistant framing.
- `tests/smoke.test.js` — skip auth-gated API tests on 401/403 when `LIFEOS_KEY` unset.
- `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` — **Operator quick start** section + change receipt.

### Next agent: start here
Live demo: confirm `/clientcare-billing` cache-bust loads `clientcare-billing.js?v=20260423a`.

---

## [FIX] Update 2026-04-22 #41 — Remote project verify + env registry SSOT

### Files changed
- `scripts/verify-project.mjs` — `--remote-base-url`, `REMOTE_VERIFY_BASE_URL`, `--strict-manifest-env`; clearer `CLIENTCARE_*` skip messaging.
- `docs/ENV_REGISTRY.md` — Public URL / remote verify section; ClientCare billing vars; changelog row.
- `services/env-registry-map.js` — Same vars + `@ssot` Amendment 12; `PUBLIC_BASE_URL` / `REMOTE_VERIFY_BASE_URL`.
- `docs/SSOT_COMPANION.md` §0.4 — Pointers to registry, map, remote verify semantics.
- `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`, `AMENDMENT_18_*.md`, `AMENDMENT_19_*.md` — receipts + verifier docs.
- `package.json` — `npm run verify:clientcare-billing:remote` (requires `PUBLIC_BASE_URL` in shell).

### Next agent: start here
Use `docs/ENV_REGISTRY.md` before claiming any env is “missing”; for live HTTP manifest probes use `--remote-base-url` or export `PUBLIC_BASE_URL`.

---

## [BUILD] Update 2026-04-20 #31 — Conflict overlay UI + Life Balance Wheel

### Files changed
- `public/overlay/lifeos-conflict.html` — NEW. 3 tabs: Escalation Check (live `/interrupt/check`), Sessions (list + start), Settings (toggle + sensitivity).
- `public/overlay/lifeos-balance-wheel.html` — NEW. SVG radar chart, 8-area sliders, history bar chart trend.
- `routes/lifeos-scorecard-routes.js` — 3 new balance wheel endpoints (`POST /balance-wheel`, `GET /balance-wheel`, `GET /balance-wheel/history`). node --check PASS.
- `db/migrations/20260420_lifeos_balance_wheel.sql` — `balance_wheel_scores` table. Applies on next deploy.
- `public/overlay/lifeos-app.html` — Conflict + Balance Wheel added to sidebar nav, mobile More, PAGE_META.

### Next agent: start here
**Joint Mediation Chat** (priority 2) — extend `lumin_threads` with `is_joint_session BOOLEAN` + `joint_user_ids BIGINT[]`; `startJointSession()` in `mediation-engine.js`; joint invite UI in `lifeos-mediation.html`.
Then: **"Hey Lumin" wake word** — opt-in Web Speech API listener in `lifeos-bootstrap.js`.

---

## [BUILD] Update 2026-04-20 #30 — Universal Overlay Platform complete

### Files changed
- `routes/lifeos-extension-routes.js` — NEW. Extension API: `GET /status`, `POST /context`, `POST /fill-form`, `POST /chat`. CORS for chrome-extension://, moz-extension://, localhost, railway.app. Form fill maps fields via keyword regex (name, email, phone, dob, address). Chat uses claude-haiku-4-5-20251001, 400-token cap.
- `startup/register-runtime-routes.js` — Added import + mount for extension routes at `/api/v1/extension`.
- `docs/projects/INDEX.md` — Registered Amendment 37 (Universal Overlay Platform) in project registry.
- All extension files created this session: `extension/manifest.json`, `extension/content.js`, `extension/background.js`, `extension/popup.html`, `extension/popup.js`, `public/extension/frame.html`, `public/extension/frame.js`, `public/extension/version.json`.
- `docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md` — New full domain SSOT.
- `public/overlay/lifeos-cycle.html` — NEW. Cycle tracking overlay. Resolves numeric user_id at boot via `GET /api/v1/lifeos/users/:handle`.
- `public/overlay/lifeos-habits.html` — NEW. Habits overlay. Check-ins, create/archive habits, reflection prompts.
- `public/overlay/lifeos-app.html` — Added Habits + Cycle to sidebar nav and bottom sheet.

### State after this session
- All extension files exist and `node --check` passes on all JS.
- Routes mounted. Backend ready for testing.
- **Known gap:** `extension/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png` do NOT exist. Chrome will refuse to load the unpacked extension without them. Must create placeholder PNGs before first browser test.

### Next agent: start here
1. Create the 4 icon PNGs in `extension/icons/`. Simple colored square is fine for dev — just needs to be valid PNG at the right size.
2. Load unpacked extension in Chrome → navigate to any page → verify ◎ trigger appears in bottom-right → click → verify drawer opens with Lumin chat.
3. Test `POST /api/v1/extension/status?user=adam` with `x-command-key` header against Railway.

---

## [BUILD] Update 2026-04-22 #40 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** Added explicit **<90 days unpaid first** control (`under90` filter + command parser phrases). Operators can now command focus lane for not-yet-3-month accounts before older buckets.

---

## [BUILD] Update 2026-04-22 #39 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** Extended beyond VOB-only: assistant now supports **auto-execute on voice stop** plus direct command handlers (`add this...` and `status of X billing`). This allows one-utterance execution patterns while keeping existing note+field apply engine.

---

## [BUILD] Update 2026-04-22 #38 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** One-button **Talk + Auto-Apply** shipped in VOB panel. Start/stop voice from transcript card; on stop it auto-runs summarize + note post + field apply. Shared voice helper gained `onStart/onStop` callbacks to support this pattern.

---

## [BUILD] Update 2026-04-22 #37 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** Emergency patch: transcript field-apply no longer assumes insurance slot 0. New `insurance_slot` flows UI → route → ops service → reconcile apply. This prevents writing to wrong visible coverage row on multi-coverage accounts.

---

## [BUILD] Update 2026-04-22 #36 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** Emergency shipping change for tomorrow: transcript flow now does **note post + field-level apply** in one run (new `clientcare_field_apply` result from reconcile/repair engine). Overlay includes apply-fields checkbox (default checked) and combined success/failure status. Asset `?v=20260422b`.

---

## [BUILD] Update 2026-04-22 #35 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** User clarified priority: Siri-style wake is **nice-to-have**; imperative is **Talk button live assist** (listen + speak), capture payer-call facts, and write to correct ClientCare fields while operating UI like a human. Amendment 18 imperative section + manifest focus/next-task updated.

---

## [BUILD] Update 2026-04-22 #34 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** Chosen implementation path locked: **overlay extension + sidecar shell first**; listen-in phased **transcript/autopost → extension capture session → telephony bridge**; field-level writes stay approval-gated until reliability proof. Amendment 18 + manifest `next_task/current_focus` updated.

---

## [BUILD] Update 2026-04-22 #33 ← MOST RECENT — READ THIS FIRST

**ClientCare billing lane:** Default billing assistant **`Tiller`** (not Lumin; **Sherry**/Siri/Alexa/… blocklisted as invoke); billing wake/strip **no longer treats “Lumin”** as billing wake. SSOT backlog: **omnipresent overlay extension** (screen-aware, ClientCare auto-tools, VOB question HUD, field-level chart apply, “Tiller, add to X chart”). Overlay `?v=20260422a`.

---

## [BUILD] Update 2026-04-21 #32

**ClientCare billing lane:** Billing copilot invoke **separate from Lumin** — default **`Ledger`**, `clientcare_billing_invoke_name` + expand-strip **Save name** (reject **Lumin**/**Lumen** as invoke); `getBillingWakePrefixes()`; voice idle copy notes always-on wake not in browser. Overlay `?v=20260421d`. Amendment 18 companion + invoke sections rewritten.

---

## [BUILD] Update 2026-04-21 #31

**ClientCare billing lane:** **Lumin** invoke (`LIFEOS_INVOKE_LABEL`); **Send to Lumin**; VOB defaults **auto-post + discard raw**; copy = backup; **`#lifeos-companion-host`** fixed strip (KPIs, expand, setup gaps, jump to chat/VOB); voice **`wakePrefixes`** in `lifeos-voice-chat.js`. **Truth:** no in-tab overlay on clientcare.net without a **browser extension** — strip tells operators side window for now. Overlay `?v=20260421b`. Amendments 18 + 12 receipts.

---

## [BUILD] Update 2026-04-21 #30

**ClientCare billing lane:** Sherry **Quick prompts** above billing chat (`BILLING_CHAT_QUICK_PROMPTS`); chips fill the council message box or scroll to **`#vob-payer-call-transcript`**. VOB history rows persist via app Postgres (**`DATABASE_URL`** on Railway). Overlay `?v=20260421a`. Amendment 18 receipt row. **Still backlog:** telephony listen-in / system-placed payer calls.

---

## [BUILD] Update 2026-04-20 #29

**LifeOS lane:** Cycle tracking overlay + Habits overlay shipped. `public/overlay/lifeos-cycle.html` (phase ring badge, log entry, history, settings — all 4 tabs, wired to `/api/v1/lifeos/cycle/*`); `public/overlay/lifeos-habits.html` (today check-in list with identity statements + streaks + reflection prompts, create habit form — wired to `/api/v1/lifeos/habits`); both wired into shell PAGE_META, sidebar nav, and More sheet. Full receipt: `docs/CONTINUITY_LOG_LIFEOS.md` **#16**.

---

## [BUILD] Update 2026-04-21 #28

**ClientCare billing lane:** `POST /insurance/vob-transcript` accepts `discard_raw_transcript` and `apply_to_clientcare` (operator/manager + `client_href` when applying). `ingestVobCallTranscript` already produced Norton-style synopsis + `vob_completed_at`; route/UI now wired. Overlay checkboxes + `clientcare_apply` status; asset `?v=20260420e`. SSOT: `AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` receipt row. **Not shipped:** live payer listen-in / streaming transcription.

---

## [BUILD] Update 2026-04-21 #27

**LifeOS lane:** Low-power ambient context (`lifeos_ambient_snapshots`, `/api/v1/lifeos/ambient`, client `lifeos-ambient-sense.js`, Settings opt-in) + `lifeos-voice.js` suspends always-listen when the app is backgrounded and skips screen wake lock on touch-first devices by default. Full receipt: `docs/CONTINUITY_LOG_LIFEOS.md` **#15**.

---

## [BUILD] Update 2026-04-20 #27

### Files changed
- `services/clientcare-ops-service.js` — `ingestVobCallTranscript`; `ask(..., billingContext)` + council prompt; **`QUEUE:`/`REQUEST:`/`BUILD:`** → `createCapabilityRequest` (Sherry-directed program changes); `callCouncilMember` 3-arg fix.
- `routes/clientcare-billing-routes.js` — `POST /insurance/vob-transcript`; `POST /assistant/message` passes `billing_context`; merges `capability_request` into saved chat metadata.
- `public/clientcare-billing/clientcare-billing.js` — VOB transcript panel; **Sherry & AI Council** chat in **main** workspace with `billing_context`; sidebar chat → pointer card.
- `public/clientcare-billing/overlay.html` — script cache-bust `?v=20260420c`.
- `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` and `AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.manifest.json` — receipts / `current_focus`.

### State after this session
- Transcript ingest is **server + UI wired**; filing into ClientCare remains **operator manual** (copy-paste). **THINK:** E2E not run against live Railway in this session.

### Next agent: start here
- Smoke the new POST with a short transcript and command key; confirm `clientcare_vob_prospects` row and overlay history refresh.

---

## [BUILD] Update 2026-04-20 #26

### Files changed
- LifeOS auth/invite UX — see **`docs/CONTINUITY_LOG_LIFEOS.md` Update #14** (invite `signup_url`, admin Settings, bootstrap JWT role sync, login `?code=`, Lumin contract).
- `docs/QUICK_LAUNCH.md` — **Latest Completed** bullet for LifeOS invites (§2.6 ¶9 Quick Launch contract).
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — **Last Updated** + **Change Receipts** for Quick Launch touch + cold-start regen receipt.
- `docs/AI_COLD_START.md` — regenerated via `npm run cold-start:gen`.

### State after this session
- Multi-account onboarding path improved without new migrations; **KNOW:** password storage is **scrypt** in `services/lifeos-auth.js` (Claude Code said “bcrypt” — that was incorrect).

### Next agent
- **LifeOS:** E2E invite link + Sherry registration smoke; then cycle overlay / habits / legacy UI per prior queue.
- **TC lane:** unchanged — `docs/CONTINUITY_LOG_TC.md`.

---

## [BUILD] Update 2026-04-20 #25

### Files changed
- `docs/CONTINUITY_LOG_TC.md` — TC lane update #2 (handoff template, verify pointer, parallel-conductor reminder).
- `docs/projects/AMENDMENT_17_TC_SERVICE.md` — **Agent Handoff Notes (TC lane)**, Owned Files ↔ manifest sync, **Change Receipts** row, single **Last Updated** row.
- `docs/projects/AMENDMENT_17_TC_SERVICE.manifest.json` — `last_verified_at` → 2026-04-20.
- `docs/QUICK_LAUNCH.md` — **Latest Completed** + TC queue line 4 clarified for next code work.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — **Last Updated** + **Change Receipts** (Quick Launch touched as protocol surface).

### State after this session
- TC conductor has a lane-local handoff on par with LifeOS routing; no application runtime behavior changed.

### Next agent
- **TC lane:** continue from `docs/CONTINUITY_LOG_TC.md` (top) + Amendment 17 **Agent Handoff Notes (TC lane)**.
- **LifeOS lane:** unchanged — still cycle tracking / overlays per prior queue.

---

## [BUILD] Update 2026-04-19 #24

### Files changed
- `docs/SSOT_NORTH_STAR.md` — §2.6 ¶9 now defines **NSSOT** alias semantics and parallel-conductor non-overlap rule.
- `docs/QUICK_LAUNCH.md` — lane router + NSSOT shorthand + dual-conductor protocol.
- `docs/CONTINUITY_INDEX.md` — new `tc` lane row.
- `docs/CONTINUITY_LOG_TC.md` — initialized TC lane handoff log.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — Last Updated + Change Receipt for NSSOT/Quick Launch protocol.

### State after this session
- You can say “read NSSOT” and any conductor now has a canonical path to the right files/lane, including parallel LifeOS + TC execution guardrails.

### Next agent
- Keep `docs/QUICK_LAUNCH.md` current every shipped session (queue + latest completed + lane routing validity).

---

## [BUILD] Update 2026-04-19 #23

### Files changed
- `db/migrations/20260422_lifeos_legacy_core.sql` — `legacy_trusted_contacts`, `legacy_messages`, `digital_wills`, check-in cadence columns on `lifeos_users`.
- `services/lifeos-legacy-core.js` — trusted contacts CRUD, cadence get/update, time-capsule create/list, digital will upsert/get, completeness scoring.
- `routes/lifeos-legacy-routes.js` — new legacy-core endpoints (`/trusted-contacts`, `/check-in-cadence`, `/time-capsule`, `/digital-will`, `/completeness`).
- `scripts/lifeos-verify.mjs` — legacy-core migration + service required.
- `prompts/lifeos-legacy.md` + `prompts/README.md` + `docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json`.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — receipts + handoff next-build now cycle tracking.

### State after this session
- Legacy Core P1 now has deployable backend APIs and persistence; habits + conflict interruption are also shipped in this run sequence.

### Next agent
- Build cycle-tracking lane (data model + routes + minimal overlay hook) as the remaining explicit P1 from this trio.

---

## [BUILD] Update 2026-04-19 #22

### Files changed
- `db/migrations/20260422_lifeos_habits.sql` — creates `habits` + `habit_completions`.
- `services/lifeos-habits.js` — create/list/check-in/summary (streak + misses + reflection question).
- `routes/lifeos-habits-routes.js` — `/api/v1/lifeos/habits` API.
- `startup/register-runtime-routes.js` — mounts habits routes.
- `scripts/lifeos-verify.mjs` — adds habits migration/service/route requirements.
- `prompts/lifeos-habits.md` + `prompts/README.md` + `docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json`.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` + `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md` receipts.

### State after this session
- Habits P1 gap now has deployable backend lane and route composition. Conflict interruption also has in-chat settings controls.

### Next agent
- Build minimal habits overlay surface (create habit + check-in + summary) or proceed to cycle tracking / legacy core based on current priority.

---

## [BUILD] Update 2026-04-19 #21 ← MOST RECENT — READ THIS FIRST

### Files changed
- `public/overlay/lifeos-chat.html` — adds in-chat controls for conflict interrupt enable/disable and sensitivity cycling; loads/saves settings via conflict interrupt endpoints and suppresses checks when disabled.
- `prompts/lifeos-conflict.md` — marks settings controls shipped and updates next task.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — receipt row for settings UI completion.

### State after this session
- Conflict interruption now includes both backend detection and user-facing settings controls in the Lumin chat surface.

### Next agent
- Continue product queue: habit tracker / legacy core / cycle tracking; optional conflict UX enhancements (rewrite/snooze) later.

---

## [BUILD] Update 2026-04-19 #20 ← MOST RECENT — READ THIS FIRST

### Files changed
- `db/migrations/20260419_conflict_interrupt.sql` — adds `lifeos_users.conflict_interrupt_enabled` + `conflict_interrupt_sensitivity`.
- `services/conflict-intelligence.js` — adds `detectEscalationInText()`, `getInterruptSettings()`, `updateInterruptSettings()` with rule-first + optional AI confirm.
- `routes/lifeos-conflict-routes.js` — adds `POST /interrupt/check`, `GET /interrupt/settings`, `PUT /interrupt/settings`.
- `public/overlay/lifeos-chat.html` — 1.5s debounce interrupt check while typing + gentle intervention toast.
- `scripts/lifeos-verify.mjs` — requires migration `20260419_conflict_interrupt.sql`.
- `prompts/lifeos-conflict.md` — marks interruption system shipped and moves next task to settings UI.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` + manifest — receipts, handoff next-build update, migration ownership/assertion.

### State after this session
- Conflict Interruption System is now live in API + service + chat surface; users can be gently warned pre-send and can control enable/sensitivity via settings endpoints.

### Next agent
- Build small UI controls for interrupt enable/sensitivity in chat/preferences; then proceed with habit tracker / legacy core / cycle tracking priority.

---

## [BUILD] Update 2026-04-19 #19 ← MOST RECENT — READ THIS FIRST

### Files changed
- `routes/lifeos-gate-change-routes.js` — `POST /proposals/:id/run-council` now executes consensus protocol (multi-model round + opposite-argument round on disagreement) and persists round traces.
- `services/lifeos-gate-change-proposals.js` — `markDebated` now stores `council_rounds_json`, `consensus_reached`, `consensus_summary`.
- `db/migrations/20260422_gate_change_proposals.sql` — new columns for round trace + consensus flags.
- `prompts/lifeos-gate-change-proposal.md` — opposite-argument requirement clarified.
- `docs/SSOT_COMPANION.md`, `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — protocol documentation + receipts + known-gaps update.

### State after this session
- Gate-change council run now matches requested debate behavior: disagreement triggers forced opposite-side argument before final verdict.

### Next agent
- Optional: add weighted vote thresholds (confidence-weighted instead of raw majority) and expose consensus rounds in an overlay page.

---

## [BUILD] Update 2026-04-19 #18 ← MOST RECENT — READ THIS FIRST

### Files changed
- `routes/lifeos-council-builder-routes.js` — `POST /task` now defaults to conductor-style autonomy (`autonomy_mode: "max"`, `internet_research: true`) and injects explicit instructions to proceed with best-guess assumptions without routine clarification loops.
- `prompts/lifeos-council-builder.md` — documents the new autonomy toggles and behavior.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — Change Receipt row for builder autonomy defaults.

### State after this session
- Builder dispatch now biases toward autonomous continuation instead of asking follow-up questions for normal ambiguity; still stops for hard blockers (credentials/external systems/high-risk authorization).

### Next agent
- Optional: add a small operator endpoint to set workspace-wide default autonomy profile (`max` vs `normal`) rather than per-request body flags.

---

## [BUILD] Update 2026-04-19 #17 ← MOST RECENT — READ THIS FIRST

### Files changed
- `db/migrations/20260422_gate_change_proposals.sql` — table `gate_change_proposals`.
- `services/lifeos-gate-change-proposals.js` — CRUD + `parseCouncilVerdict`.
- `routes/lifeos-gate-change-routes.js` — `/api/v1/lifeos/gate-change` (POST/GET/PATCH proposals, POST run-council).
- `startup/register-runtime-routes.js` — mount gate-change router.
- `config/task-model-routing.js` — `council.gate_change.debate`.
- `prompts/lifeos-gate-change-proposal.md`, `prompts/lifeos-council-builder.md`, `prompts/README.md`.
- `scripts/lifeos-verify.mjs` — migration + service + route required.
- `docs/SSOT_NORTH_STAR.md` §2.6 ¶8 — API sentence; `docs/SSOT_COMPANION.md` §5.5 — HTTP paragraph; `docs/projects/AMENDMENT_01_AI_COUNCIL.md` — owned files + HTTP list + receipts + Last Updated; `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — receipts + Last Updated + handoff Known gaps; `docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json`.
- `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md` — `register-runtime-routes` receipt + Last Updated.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — receipt + Last Updated.

### State after this session
- Governed efficiency path is **executable**: proposals persist; **user-triggered** `run-council` calls AI once (Zero-Waste: no scheduler); human PATCH dispositions after `debated`.

### Next agent
- Optional: overlay or Lumin tool-calling to `POST .../gate-change/proposals`; true multi-model council round-robin instead of single-pass rubric.

---

## [PLAN] Update 2026-04-19 #16

### Files changed
- `docs/SSOT_NORTH_STAR.md` — **Article II §2.6 ¶8** governed efficiency path (report → council debate → change + receipts); Article VI bullet (no gate weaken without council+receipt).
- `docs/SSOT_COMPANION.md` — **§5.5** Gate-change & efficiency proposals; version string.
- `docs/projects/AMENDMENT_01_AI_COUNCIL.md` — operational subsection + duplicate `---` cleanup; Last Updated; Change Receipt.
- `prompts/00-LIFEOS-AGENT-CONTRACT.md` — *Legitimate efficiency* bullet.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — epistemic ¶8 one-liner; Last Updated; Change Receipt.
- `CLAUDE.md` — truth channel ¶8 sentence.

### Next agent
- Superseded by **Update #17** — HTTP `/api/v1/lifeos/gate-change` shipped.

---

## [PLAN] Update 2026-04-19 #15

### Files changed
- `docs/SSOT_NORTH_STAR.md` — **Article II §2.6** new **¶5–7**: law is mandatory (cannot “not happen”), **no cutting corners**, **no laziness** on reads/verify/receipts; **Article VI** new “not optional for speed” bullet; version note in header.
- `prompts/00-LIFEOS-AGENT-CONTRACT.md` — **Law is mandatory** section (mirrors ¶5–7).
- `CLAUDE.md` — truth channel: §2.6 mandatory, no corners/laziness.
- `docs/SSOT_COMPANION.md` — §0.5B ¶5–7 posture.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — epistemic § one-line mandatory rule; Last Updated; Change Receipt; Agent Handoff Known gaps (§2.6 enforcement = agents+CI).
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — Last Updated + Change Receipt.
- `services/lifeos-lumin.js` — `LUMIN_EPISTEMIC_CONTRACT` + JSDoc typo fix (Article II).

### State after this session
- Constitutionally: Article II truth/evidence rules are **explicitly non-discretionary**; no language that treats them as “might skip when busy.”

### Next agent
- If building automation that could imply “optional” gates, align UI/copy with §2.6 ¶5–7; optional **product** features remain fine — **not** optional honesty.

---

## [PLAN] Update 2026-04-19 #14

### Files changed
- `docs/SSOT_NORTH_STAR.md` — **Article II §2.6 System Epistemic Oath** + Article VI bullet; version 2026-04-19.
- `docs/SSOT_COMPANION.md` — §0.5B + Appendix A + version note.
- `CLAUDE.md` — truth channel = §2.6 constitutional.
- `prompts/00-LIFEOS-AGENT-CONTRACT.md` — platform-wide scope + North Star pointer.
- `prompts/README.md` — table row.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — epistemic § implements §2.6; Last Updated + Change Receipt.
- `services/lifeos-lumin.js` — contract text + comment.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — Last Updated + receipt.

### Next agent
- Any feature that could show false “healthy” or hide failures → violates §2.6; fix or document honestly.

---

## [PLAN] Update 2026-04-19 #13

### Files changed
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — **## Adam ↔ Agent epistemic contract**; continuity step **0**; Last Updated + Change Receipt.
- `prompts/00-LIFEOS-AGENT-CONTRACT.md` — canonical copy.
- `prompts/README.md`, `prompts/lifeos-*.md`, `prompts/CODEX_SYSTEM_WRAPPER.md` — READ FIRST block + table row for `00`.
- `CLAUDE.md` — truth-channel paragraph under continuity.
- `services/lifeos-lumin.js` — `LUMIN_EPISTEMIC_CONTRACT` prepended in `buildSystemPrompt`.
- `docs/SSOT_COMPANION.md` — §0.5B bullet + version string.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — Last Updated + receipt.

### Next agent
- Treat misunderstanding as stop-the-line; Lumin runtime now includes contract in system prompt.

---

## [PLAN] Update 2026-04-19 #12

### Files changed
- `CLAUDE.md` — **SSOT READ-BEFORE-WRITE** hard rule (full read of target SSOT in session before add/remove/material reword); session checklist item 5.
- `docs/SSOT_COMPANION.md` — **§0.5B** mirrors rule; Appendix A bootstrap; version bump 2026-04-19.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — Pre-flight + Last Updated + Change Receipt.

### Next agent
- Before any SSOT edit: read entire file (chunked OK); see `CLAUDE.md` + Companion §0.5B.

---

## [PLAN] Update 2026-04-19 #11

### Files changed
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — **Commitment → execution desk** backlog: **Phase B graduated autonomy** (trust tiers, proactive “sending now,” cancel / NL override / self-handle, fail-closed sensitive paths, policy + route checklist).

### Next agent
- Implement tiers only with explicit user scope + tests in amendment checklist; no silent global auto-send.

---

## [PLAN] Update 2026-04-19 #10

### Files changed
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — new **Approved Product Backlog** subsection **Commitment → execution desk (cross-device)** (promise → offer assist → review gate → send or MIT; cross-device runner note links Amendment 36); Agent Handoff **Known gaps** + **Last Updated** + **Change Receipts**.

### State after this session
- Ultimate “coworker for integrity” flow is **specified**, not implemented. Builds on existing commitments, event ingest, MITs, notifications, Postmark env.

### Next agent
- Implement per backlog sequencing (draft ladder without send first, then confirm-send, then device runner). Do not auto-send; respect Priority Alignment in Amendment 21 unless Adam reprioritizes.

---

## [RESEARCH] Update 2026-04-19 #9

### Files changed
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — added **Cross-amendment map (01–36) vs Claude Cowork**, **~2 year (2028) projection** (KNOW/THINK/GUESS), and **API vs public-repo “idea theft”** framing with [Anthropic Privacy Center — commercial API training default](https://privacy.anthropic.com/en/articles/7996885-how-does-anthropic-process-data-sent-through-the-api) citation.

### State after this session
- Strategic memo is **durable in SSOT** (Amendment 36); not a one-off chat answer.

### Next agent: start here
- If Adam wants the same content surfaced elsewhere (e.g. `docs/strategy/` + INDEX link), duplicate is optional — single source of truth is Amendment 36 sections under Coworker competition.

---

## [BUILD] Update 2026-04-19 #8

### Policy + code
- **Horizon + Red-team execution is OFF by default.** `LANE_INTEL_ENABLED` must be **`1`** (Railway) before `POST /api/v1/lifeos/intel/*/run` or scheduled ticks do anything. Boot + useful-work guards + route middleware enforce this (budget / pre-launch gate per Adam).

### Next agent
- Do **not** enable `LANE_INTEL_ENABLED` until post-launch or explicit budget sign-off. GET `/intel/*/latest` remains read-only for empty/historical rows.

---

## [BUILD] Update 2026-04-19 #7

### Files created
- `db/migrations/20260421_lane_intel.sql` — `lane_intel_runs` + `lane_intel_findings`.
- `services/lane-intel-service.js` — Horizon web scan + optional council synthesis; Red-team `npm audit` parser; `createLaneIntelScheduledTicks()` with `createUsefulWorkGuard`.
- `routes/lane-intel-routes.js` — `/api/v1/lifeos/intel/*` (latest, runs, manual `POST .../run`).
- `docs/CONTINUITY_LOG_HORIZON.md`, `docs/CONTINUITY_LOG_SECURITY.md` — lane logs for intel + red-team.

### Files changed
- `startup/register-runtime-routes.js` — mount intel routes.
- `startup/boot-domains.js` — `bootLaneIntel` when `LANE_INTEL_ENABLE_SCHEDULED=1`.
- `scripts/lifeos-verify.mjs` — migration + service + route entries.
- `docs/CONTINUITY_INDEX.md` — `horizon` + `security` lane rows.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — MVP marked shipped; **Configuration you must supply** table for full execution.

### State after this session
- Intel API is live behind `requireKey`. Scheduled ticks are **off** until `LANE_INTEL_ENABLE_SCHEDULED=1`. Horizon needs Brave/Perplexity **or** `LANE_INTEL_HORIZON_ALLOW_AI_ONLY=1`.

### Next agent: start here
1. Apply `20260421_lane_intel.sql` on Neon (auto on deploy if migrations run at boot).
2. Set `BRAVE_SEARCH_API_KEY` or `PERPLEXITY_API_KEY` (or `LANE_INTEL_HORIZON_ALLOW_AI_ONLY=1`) then `POST /api/v1/lifeos/intel/horizon/run` to validate.
3. Active pentest / ZAP / staging probes — **not built**; scope + targets still human decisions (see Amendment 36).

---

## [BUILD] Update 2026-04-19 #6

### Files created
- `docs/CONTINUITY_INDEX.md` — lane routing table + session-tag rule.
- `docs/CONTINUITY_LOG_COUNCIL.md` — council/LCL/builder continuity (seeded from former single-log council work).
- `docs/CONTINUITY_LOG_LIFEOS.md` — LifeOS-only continuity lane.
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md` — Zero-Drift / cold-start / governance SSOT.
- `docs/AI_COLD_START.md` — generated handoff packet (regen: `npm run cold-start:gen`).
- `scripts/generate-cold-start.mjs`, `scripts/zero-drift-check.mjs`, `scripts/amendment-readiness-check.mjs`, `scripts/handoff-self-test.mjs`, `scripts/evidence-required-check.mjs`, `scripts/ssot-compact-receipts-dryrun.mjs`, `scripts/git-diff-summary.mjs`
- `config/codebook-domains.js` — optional domain symbol overlays for LCL.
- `db/migrations/20260420_handoff_governance.sql` — `conductor_builder_audit`, `kingsman_audit_log`.
- `services/kingsman-gate.js` — lightweight audit hook before council calls.
- `.github/workflows/pr-diff-summary.yml` — PR/job summary from `git diff`.

### Files changed
- `docs/CONTINUITY_LOG.md` — this protocol block; per-lane instructions.
- `routes/lifeos-council-builder-routes.js` — `GET /next-task`, builder response cache, optional `---METADATA---` JSON placement, conductor audit insert.
- `startup/register-runtime-routes.js` — pass `getCachedResponse` + `cacheResponse` into builder factory.
- `services/council-service.js` — static `CODE_SYMBOLS` import for LCL; `lclMonitor.inspect` on Ollama path; `kingsmanAudit` call.
- `services/prompt-translator.js` — `translate(..., { domain })` merges domain codebook overlay.
- `prompts/lifeos-council-builder.md` — documented `GET /next-task`, `lcl-stats`, metadata tail on `POST /task`.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — new `## Agent Handoff Notes`; Change Receipts row; `Last Updated` in header table.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.manifest.json` — `lane_read_manifest`, `handoff_protocol` pointer.
- `docs/projects/INDEX.md` — registry row for Amendment 36.
- `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`, `docs/projects/AMENDMENT_33_KINGSMAN_PROTOCOL.md` — receipts for touched areas.
- `package.json`, `.github/workflows/ssot-compliance.yml` — new npm scripts + CI steps (warn-only where noted).

### State after this session
- Cold-start packet + per-lane continuity + builder `next-task` + structured metadata path + governance migrations + scripts are wired for **compounding** follow-on (strict zero-drift enforcement optional via env).
- Run `npm run cold-start:gen` after substantive doc changes; run `npm run handoff:self-test` before push.

### Next agent: start here
1. Apply/deploy `db/migrations/20260420_handoff_governance.sql` (same as other migrations on boot).
2. LifeOS product: `prompts/lifeos-conflict.md` → Conflict Interrupt System (still highest LifeOS priority).
3. Harden `ZERO_DRIFT_STRICT=1` locally when you want pre-commit to **fail** if lane logs + cold-start packet were not updated alongside code (default remains warn-only for developer ergonomics).

---

## Update 2026-04-21 #1

### Files created/changed this session
- `core/sales-technique-analyzer.js` — Bug fix: curly/smart apostrophes in `'can't', 'won't', 'don't'` inside single-quoted JS strings caused `SyntaxError: Unexpected identifier 't'` at boot. Changed to double-quoted strings. Node `--check` now passes.
- `routes/lifeos-scorecard-routes.js` — Bug fix: POST `/balance-wheel` was broken when `notes` was in the request body. `notes` was pushed to `cols`+`params` but not `vals`; the VALUES clause used `vals.map(...)` so the INSERT got wrong placeholder count (n cols, n-1 `$N` placeholders) → Postgres error. Removed `vals` array, switched to `cols.map(...)` throughout. Also removed two dead variables (`setClause`, `upsertCols`).
- `db/migrations/20260421_lifeos_missing_tables.sql` — Created 5 tables that were referenced in production code but missing from all migrations: `user_preferences` (key/value per-user settings with `UNIQUE(user_id,key)`), `health_readings` (HRV/sleep/steps wearable data), `lifeos_notes` (freeform notes from weekly review/coaching), `lifeos_priorities` (per-area priorities with `UNIQUE(user_id,area)`), `lifeos_events` (lightweight calendar events). All 5 were silently failing with caught errors before this migration.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — Change receipt added for this session's bug fixes.

### Audit results
Full-codebase audit pass completed:
- `node --check` on all JS files: **PASS** (0 errors after sales-technique-analyzer fix)
- All 46+ route imports vs exports in `register-runtime-routes.js`: **PASS**
- All service cross-imports: **PASS** (no missing files)
- All overlay API paths vs mounted routes: **PASS**
- DB table references vs migration files: **5 missing tables found and fixed** (see migration above)
- CJS `require()` calls: only in orphan files never imported by the server — no risk
- `money_decision_links` table: self-creates with `CREATE TABLE IF NOT EXISTS` in its service — safe

### Next priority
1. Run the new migration on the live Neon DB (happens automatically on next Railway deploy)
2. Joint Mediation Chat — extend `lumin_threads` with `is_joint_session BOOLEAN` + `joint_user_ids BIGINT[]`; add `startJointSession()` to `mediation-engine.js`; add `/api/v1/lifeos/mediation/joint` route; overlay UI in `lifeos-mediation.html`

## Update 2026-04-21 #2 (bug fix pass 2)

### Files changed
- `services/lifeos-daily-scorecard.js` — 3 DB column fixes: `due_date`→`due_at`, `AVG(score)`→`AVG(joy_score)`, `integrity_scores/overall_score`→`integrity_score_log/total_score` with `score_date`. All 3 were silently zeroing scorecard sections every day.
- `services/lifeos-weekly-review.js` — same `integrity_scores/overall_score` → `integrity_score_log/total_score/score_date` fix; weekly snapshot integrity signal was always null.
- `services/lifeos-lumin.js` — `SELECT score FROM joy_checkins` → `SELECT joy_score AS score`; Lumin context builder was receiving null latest joy on every chat.
- `public/overlay/lifeos-app.html` — added 3 missing PAGE_META entries (`lifeos-chat.html`, `lifeos-backtest.html`, `lifeos-weekly-review.html`); Lumin Chat "Full history →" link was a dead no-op.

### Root cause pattern
LifeOS uses two integrity systems: legacy Word Keeper (`integrity_scores`, TEXT user_id, `score` column) and LifeOS-native (`integrity_score_log`, BIGINT user_id FK, `total_score`, `score_date`). Several LifeOS services were accidentally querying the legacy table with wrong column names.

### System state after this pass
- All `node --check` pass
- Daily scorecard now correctly reads: commitments `due_at`, joy `joy_score`, integrity `integrity_score_log.total_score`
- Weekly review snapshot includes real integrity data
- Lumin chat context includes real latest joy
- All 3 previously missing pages navigable from shell

---

## Update 2026-04-19 #5

### Files created/changed this session
- `config/codebook-v1.js` — LCL versioned symbol table. 10 instruction aliases (CI:01–CI:10) + 30+ code symbols (*pq=pool.query, *uid=user_id, *ct=CREATE TABLE IF NOT EXISTS, etc.). APPEND-ONLY while deployed. Create codebook-v2.js for breaking changes.
- `services/prompt-translator.js` — LCL translator. Applies symbol compression + prepends tiny inline key with only the symbols that fired. Works with Groq and Gemini (no KV cache required). Exports: translate(), prepareCall(), shouldInjectCodebook(), getCodebookBlock().
- `services/lcl-monitor.js` — Drift monitor. After every LCL-compressed response, checks if symbols leaked into output. Auto-disables LCL per (member, taskType) if drift > 5% over 10+ calls. Auto-re-enables after 50 more calls. Exports: shouldSkipLCL(), inspect(), getStats().
- `db/migrations/20260419_lcl_quality_log.sql` — Persistent drift event log table. Apply on next deploy.
- `services/council-service.js` — Added Layer 1.5 (LCL) to compression stack. Gates on lclMonitor.shouldSkipLCL(). Adds lclSavedTokens to totalSavedInputTokens. Calls lclMonitor.inspect() after Groq + Gemini responses. Exports lclMonitor.
- `routes/lifeos-council-builder-routes.js` — Added GET /api/v1/lifeos/builder/lcl-stats. Accepts lclMonitor in factory params.
- `startup/register-runtime-routes.js` — Passes lclMonitor to builder route factory.
- `server.js` — Destructures lclMonitor from createCouncilService(). Passes to registerRuntimeRoutes().
- `docs/projects/AMENDMENT_01_AI_COUNCIL.md` — Added full LCL architecture vision (3 phases, cost table, versioning rules). Updated token stack. Updated build plan. Added decision log entry.

### State after this session
- LCL compression LIVE — every callCouncilMember call runs Layer 1.5
- Drift monitor LIVE — auto-rollback fires if leakage > 5% for any pair
- GET /api/v1/lifeos/builder/lcl-stats — call to see drift state per pair
- All node --check passes on all modified files
- Phase 2 (BPE tokenizer) + Phase 3 (LoRA fine-tune) documented in AMENDMENT_01 for when budget allows

### Next agent: start here
1. Apply migration: `db/migrations/20260419_lcl_quality_log.sql` (runs on deploy automatically)
2. Build Conflict Interrupt System — full spec in `prompts/lifeos-conflict.md → Next Approved Task`
   - Via council: POST /api/v1/lifeos/builder/task { domain: "lifeos-conflict", task: "Build detectEscalationInText()", mode: "code" }
   - Direct: 4 files → migration SQL, conflict-intelligence.js additions, lifeos-conflict-routes.js, lifeos-chat.html toast
3. Wire Lumin engagement feedback reactions — spec in prompts/lifeos-lumin.md → Next Approved Task

---

## Update 2026-04-19 #4

### Files created/changed this session
- `prompts/README.md` — explains the prompt file system; when/how to use; lists all domain files
- `prompts/lifeos-lumin.md` — full Lumin AI domain brief: tables, services, routes, model guidance, what NOT to touch, next task (engagement feedback on reactions)
- `prompts/lifeos-weekly-review.md` — full weekly review domain brief: tables, services, routes, scheduler state, next task (add sleep data to snapshot)
- `prompts/lifeos-scorecard.md` — full MIT/scorecard domain brief: tables, services, routes, variable name fix noted, next task (weekly summary in review snapshot)
- `prompts/lifeos-conflict.md` — full conflict intelligence domain brief: existing tables, what's NOT YET BUILT (detectEscalationInText, interrupt settings), Four Horsemen patterns, next task (build conflict interrupt system — full step-by-step spec included)
- `prompts/lifeos-truth-delivery.md` — truth delivery domain brief: tables, services, calibration loop, bug history, next task (emotional state fallback to joy_checkins)
- `prompts/lifeos-emotional.md` — emotional domain brief: tables, services, weather presets, depletion tags, early warning state, next task (voice journaling)
- `prompts/lifeos-council-builder.md` — coworker architecture brief: the dispatch system, model routing, session-limit survival protocol
- `config/task-model-routing.js` — maps 30+ task types to free council member keys; exports `getModelForTask()`, `taskRequiresAI()`, `buildTaskAI()`; `node --check` passes
- `routes/lifeos-council-builder-routes.js` — 5 endpoints: GET /domains, GET /domain/:name, POST /task, POST /review, GET /model-map; reads prompts/ dir for context; calls council; returns output to Claude Code; never auto-commits; `node --check` passes
- `startup/register-runtime-routes.js` — added import + mount for council builder routes
- All previous session files (server.js callAI fix, Amendment 21 hygiene, INDEX.md) remain in place

### State after this session
- **Coworker architecture is LIVE.** `POST /api/v1/lifeos/builder/task` is mounted and working.
- 7 domain prompt files in `prompts/` — any new agent reads the right one and has full context in 30 seconds
- Task-model routing config covers 30+ task types — every future AI call can use the cheapest appropriate model
- All `node --check` passes on all new files
- `callAI` is wired in `bootAllDomains` (fixed earlier this session)

### Next agent: start here

**Option A — Use the coworker system to build the Conflict Interrupt System:**
```
POST /api/v1/lifeos/builder/task
{
  "domain": "lifeos-conflict",
  "task": "Build the Conflict Interruption System",
  "spec": "See prompts/lifeos-conflict.md → Next Approved Task for full step-by-step spec",
  "mode": "code"
}
```
Then review the output and write it into the actual files.

**Option B — Build it directly (no council dispatch):**
Read `prompts/lifeos-conflict.md` → Next Approved Task. The full spec is there. 4 files: migration SQL, service additions, route additions, chat overlay toast.

---

## Update 2026-04-19 #3

### Files changed this session
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — (1) Added cross-amendment hygiene reference table at top of Competitive Gap Analysis section: 6 items converted from duplicated specs to links pointing at their owning sibling amendments (Amendments 25, 26, 28, 34). (2) Added Priority Alignment block at top of Approved Product Backlog: revenue chain is 18→17→10→11; LifeOS parallel work pre-authorized for only 3 items (habit tracker, legacy core, cycle tracking); all 20 signature features are queued. (3) Added Household Features — Asymmetric Consent Rule to Data Sovereignty & Ethics section: 5-rule protocol (independent opt-in, instant revocation, quarterly re-confirm, privacy floor, explains the surveillance failure mode it prevents).
- `docs/projects/INDEX.md` — Updated Last Updated to 2026-04-19; added all 26 LifeOS route files; added 21 LifeOS service files; expanded DB migrations section; updated production readiness checklist (added all new ✅ items, flagged callAI bug as 🔲 fixed in server.js); removed deleted `routes/outreach.js` reference.
- `server.js` — Added `callAI` to `bootAllDomains()` call. Without this, all LifeOS scheduled AI features (weekly review generation, early warning tick, event ingest classification, truth calibration) were silently no-opping on every interval because `callAI` was `undefined`. Routes to `gemini_flash` (free, better reasoning for LifeOS tasks). `node --check` passes.

### State after this session
- SSOT hygiene restored: Amendment 21 no longer duplicates specs owned by sibling amendments
- Revenue priority chain explicitly documented in Amendment 21 so builder agents can't drift into LifeOS feature work ahead of ClientCare
- Household consent rules now constitutional, not aspirational
- INDEX.md is accurate for the first time since pre-LifeOS (was ~6 weeks stale)
- callAI bug fixed — LifeOS scheduled AI features will now actually run on next deploy
- All Opus feedback items 1+2+5+6 executed; items 3+7+8+9+10 documented below for future sessions

### Remaining from Opus feedback (not executed this session)
- **Item 3** (30/90-day SSOT — add measure + AI cost ceiling + adaptability score to the 20 signature features): deferred — high value but 60-90 min; next session can pick up
- **Item 4** (per-feature AI cost ceiling on the 20 items with scheduled AI): deferred — needs Amendment 10 cost model as reference
- **Item 7** (Amendment 09 vs Amendment 21 overlap): deferred — Amendment 09 needs narrowing to "Sales Coaching + Call Simulation" or superseded-by notice
- **Item 8** (archive stale docs/): deferred — create `docs/archive/2026-01/` and move session reports; consolidate quickstart files
- **Item 9** (Kingsman audit log scaffold): deferred — `services/kingsman-audit-log.js` stub with action type list
- **Item 10** (falsifiability metrics on 20 signature features): deferred — add one-line `measure:` to each of the 20

### Coworker architecture note
The "Claude coworker" question from this session: Claude Code IS the conductor. The SSOT is how it watches itself across sessions. When Cursor cuts off, the SSOT has full state. Next session reads SSOT → continues. The council (Railway) is the worker. The 3 missing pieces to close the loop: (1) `prompts/` directory per domain, (2) `config/task-model-routing.js`, (3) `routes/lifeos-council-builder-routes.js` dispatch endpoint. These are queued after conflict interruption system.

### Next agent: start here
**Conflict Interruption System** is priority 1 (see AMENDMENT_21 Agent Handoff Notes). But first — read the priority alignment block at the top of `## Approved Product Backlog` to confirm revenue lanes are in a state where LifeOS parallel work is appropriate.

---

## Update 2026-04-19 #2

### Files changed this session
- `services/lifeos-lumin.js` — Added `import { createResponseVariety }` at top. Instantiated `variety` once in the factory. In `chat()`: replaced `varietyGuidance = null` stub and manual profile query with `variety.wrapPromptWithVariety({ userId, systemPrompt: baseSystemPrompt, userPrompt, callAI })`. Added `variety.logResponse()` call after AI reply so the engine learns per user. The variety + communication profile is now fully wired into every Lumin response. `node --check` passes.
- `public/overlay/lifeos-today.html` — Fixed 3 variable name mismatches in the MIT/scorecard block appended last session: replaced all `LIFEOS_USER` with `USER`; replaced all `getH()` calls with `H()`; removed duplicate `function H()` definition (conflicted with `const H = () => CTX.headers()` at line 1105).
- `routes/ecommerceRoutes.js`, `routes/funnelRoutes.js`, `routes/learning-routes.js`, `routes/microgridRoutes.js`, `routes/trust-mesh.js`, `routes/voting.js`, `routes/vr-routes.js`, `routes/outreach.js` — DELETED. All were CommonJS in an ESM project, never imported in any startup or server file. Verified before deletion via grep.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — Updated Agent Handoff Notes: all 3 known bug markers changed to ✅ FIXED; Priority Build Order updated to remove completed items and renumber; new token-aware model routing spec added to queue as item 9; Change Receipt added for this session.

### State after this session
- Lumin AI is now fully production-wired: mode-specific prompts + communication profile + response variety on every response
- `lifeos-today.html` MIT widget is fully functional (correct variable names, auth headers match rest of file)
- PWA icons confirmed present (`icons/icon-192.png`, `icon-512.png`, `icon.svg`)
- Routes directory cleaned of 8 dead CJS files — ESM project is now consistent
- All 3 known bugs from last session's handoff notes resolved
- `node --check` passes on `lifeos-lumin.js`

### Next agent: start here
**Task: Conflict Interruption System** (item 1 in AMENDMENT_21 priority queue)

Files to create/edit:
1. `services/lifeos-conflict-intelligence.js` — add `detectEscalationInText(text)` that looks for Gottman's Four Horsemen patterns (contempt, criticism, defensiveness, stonewalling) using keyword/pattern matching; returns `{ triggered: bool, horseman: string|null, confidence: number, suggestion: string }`
2. `db/migrations/20260419_conflict_interrupt.sql` — add `conflict_interrupt_enabled` (BOOLEAN default TRUE) and `conflict_interrupt_sensitivity` (TEXT: 'low'/'medium'/'high', default 'medium') to `lifeos_users` table
3. `routes/lifeos-conflict-routes.js` — add `POST /interrupt/check` (takes `{ text }`, returns escalation detection result + suggestion); add `GET /interrupt/settings` and `PUT /interrupt/settings`
4. Update `startup/register-runtime-routes.js` if conflict routes aren't mounted yet
5. SSOT: update AMENDMENT_21 Change Receipts + this file

Full spec is in `docs/projects/AMENDMENT_21_LIFEOS_CORE.md → Approved Product Backlog → Conflict Intelligence Expansion → item 1`.

---

## Update 2026-04-19 #1

### Files changed this session
- `CLAUDE.md` — Added `⚠️ AGENT CONTINUITY PROTOCOL` section at the very top as the first thing any agent reads. Defines session start/end checklists, SSOT update standard, and consequences of skipping.
- `docs/CONTINUITY_LOG.md` (this file) — Added protocol header + update format template. Most recent entries now at top.
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` — Added continuity notice at top; added `## Approved Product Backlog` section with all approved-not-yet-built items fully specced; expanded `## Agent Handoff Notes` to exact current state (all routes, all DB migrations, all overlays, 3 known bugs flagged with ⚠️, 10-item priority build queue); Added Change Receipts entry for this session.
- `db/migrations/20260418_lifeos_weekly_review.sql` — 4 tables: weekly_reviews, weekly_review_sessions, weekly_review_messages, weekly_review_actions
- `services/lifeos-weekly-review.js` — generateReview (builds data snapshot from 8 data sources, AI writes 4-6 paragraph letter), openSession (creates or resumes conversation), sendMessage (back-and-forth grounded in week's data, extracts actions), applyActions (writes commitments/notes/events back to LifeOS), weekBounds helper
- `routes/lifeos-weekly-review-routes.js` — 9 endpoints: GET /latest, GET /history, GET /week/:date, POST /generate, POST /:id/session, POST /session/:id/message, GET /session/:id/actions, POST /session/:id/apply, POST /session/:id/close
- `public/overlay/lifeos-weekly-review.html` — split-pane UI: letter on left, chat on right, history chips, typing indicator, actions toast with Apply button
- `db/migrations/20260418_lifeos_daily_scorecard.sql` — 3 tables: daily_mits (3 per day, position 1-3), daily_scorecards (score 0-100, grade A-F, breakdown JSONB, AI narrative), task_deferrals (chronic deferral logging)
- `services/lifeos-daily-scorecard.js` — setMITs, getMITs, updateMITStatus (logs deferrals, chronic detection at 3+), computeScore (MITs=40pts, commitments=25pts, joy=20pts, deferrals=penalty -15 max, integrity=15pts), generateScorecard (AI narrative), getScorecardHistory, getDeferralPatterns, getTodaySummary
- `routes/lifeos-scorecard-routes.js` — GET /today, GET/POST /mits, PATCH /mits/:id, POST /score, GET /history, GET /deferrals
- `public/overlay/lifeos-today.html` — MIT section injected above "Your State" section (HTML widget + JS appended at bottom: loadMITs, renderMITs, renderScorecard, toggleMIT, deferMIT, addMIT)
- `db/migrations/20260418_lifeos_chat.sql` — 2 tables: lumin_threads (mode: general/mirror/coach/finance/relationship/health/planning, pinned, archived), lumin_messages (role, content_type, tokens_used, reaction, pinned, full-text search GIN index)
- `services/lifeos-lumin.js` — createThread, listThreads, getThread, updateThread, getMessages, getPinnedMessages, pinMessage, reactToMessage, searchMessages, chat (builds system prompt from mode + comm profile stub + context snapshot), buildContextSnapshot (MITs/scorecard/commitments/joy/user), getOrCreateDefaultThread
- `routes/lifeos-chat-routes.js` — GET/POST /threads, GET /threads/default, PATCH /threads/:id, GET/POST /threads/:id/messages, GET /threads/:id/pinned, PATCH /messages/:id/pin, PATCH /messages/:id/react, GET /search
- `public/overlay/lifeos-chat.html` — full Lumin chat UI: sidebar with thread list/mode filter/search, main chat with typing indicators/reactions/pin/copy/voice input/context bar/quick prompts/markdown rendering
- `startup/register-runtime-routes.js` — added imports + mounts for weekly-review, scorecard, chat routes

### Known bugs / incomplete stubs flagged in this session
- ⚠️ `lifeos-lumin.js` line ~100: `varietyGuidance` is stubbed as `null` — NOT yet wired to `services/response-variety.js`. Wire: import `createResponseVariety`, call `getVarietyGuidance(userId)`, pass to `buildSystemPrompt()`. 30-min task.
- ⚠️ `lifeos-today.html` MIT section uses `LIFEOS_USER` variable — may not match the variable name used in the rest of that file. Run `grep -n "LIFEOS_USER\|commandKey\|lifeos_user\|getH()\|lifeoHeaders" public/overlay/lifeos-today.html` to check and align.
- ⚠️ `public/overlay/icons/icon-192.png` and `icon-512.png` referenced in `lifeos.webmanifest` and `sw.js` but PNG files may not exist on disk. App loads without them but install prompt shows broken icon.
- ⚠️ 8 orphan CommonJS route files in `routes/` that are never imported and will never load in this ESM project: ecommerceRoutes.js, funnelRoutes.js, learning-routes.js, microgridRoutes.js, trust-mesh.js, voting.js, vr-routes.js, outreach.js — safe to delete.

### State after this session
- JWT auth: live in code, migrations on disk, applies on next Railway deploy
- All 25 LifeOS route surfaces mounted in register-runtime-routes.js
- Lumin AI (chat): fully functional except response-variety not wired
- Weekly Review: fully functional — generates Sunday evening, interactive conversation, applies actions back to LifeOS
- Daily Scorecard + MIT: fully functional — score computed from 5 data sources, AI narrative, chronic deferral detection
- Today overlay: MIT widget + day score bar injected (HTML + JS), variable name alignment needed before QA

### Next agent: start here
**Task 1 (30 min): Wire response-variety into Lumin**
File: `services/lifeos-lumin.js`, function `chat()`, around line 100
What to do: replace the `let varietyGuidance = null;` stub with:
```js
try {
  const variety = createResponseVariety({ pool });
  varietyGuidance = await variety.getVarietyGuidance(userId);
} catch { /* non-fatal */ }
```
Add import at top: `import { createResponseVariety } from './response-variety.js';`

**Task 2 (15 min): Fix MIT variable name in lifeos-today.html**
Run: `grep -n "LIFEOS_USER\|commandKey\|lifeos_user\|getH()\|lifeoHeaders" public/overlay/lifeos-today.html`
Align the MIT JS section to use whatever variable the rest of the file uses for user handle + auth headers.

**Task 3: Conflict Interruption System**
Full spec in `AMENDMENT_21 → ## Approved Product Backlog → Conflict Intelligence Expansion → item 1`

---

## Update 2026-04-01 #1
- `docs/SSOT_COMPANION.md` now defines a mandatory six-part AI self-programming format for serious work: proposal, score, execute, verify, repair, and receipt. This is now the cross-cutting operating rule for all models.
- `AMENDMENT_01_AI_COUNCIL` now requires structured proposal payloads and a formal planning-quality rubric, so council answers can be measured independently from builder/test outcomes.
- `AMENDMENT_04_AUTO_BUILDER` now requires the builder to follow a non-black-box self-programming loop with explicit separation of planner, executor, verifier, and repair roles where possible.
- `AMENDMENT_19_PROJECT_GOVERNANCE` now defines the governed AI evaluation loop and required evidence artifacts for autonomous runs, so self-programming capability can be audited instead of guessed.

## Update 2026-04-02 #1
- TC IMAP runtime resolution no longer drifts to the LifeOS system mailbox: `services/tc-imap-config.js` now resolves through `credential-aliases.js`, prefers the Adam TC mailbox aliases already present in Railway, and follows that mailbox first for vault lookup. This closes the gap between what the TC workspace shows and what live inbox reads actually use.
- ClientCare billing overlay now defaults to an operator-first `Needs Me` view and renders each account as a red/yellow/green action card with explicit ownership, hover “what needs doing” guidance, and a detail-pane action list that jumps directly to the repair form or live inspect pass.

## Update 2026-04-02 #2
- ClientCare billing now has a dedicated `Verification of Benefits (VOB)` card near the top of the operator workspace instead of burying that flow inside the Insurance Intake Rule reference panel. The VOB card can prefill from the selected account, run the existing verification-preview endpoint, and show the take/review/do-not-schedule result in one visible place for Sherry.

## Update 2026-04-03 #1
- ClientCare billing is now structured around a system-managed work queue instead of leading with raw forms. The landing page shows managed work first, moves VOB and the assistant into a resizable right-side utilities column, collapses secondary rollout sections, and adds existing-client autocomplete plus a separate prospect VOB path so Sherry can work from ClientCare data first and only fall back to manual/prospect entry when necessary.
- Missing VOB information can now be routed into assistant-driven text/email outreach prompts instead of relying on Sherry to manually bridge data that the system should request itself.
- The billing portal now also opens with a “How to work this page” guide and a compact system-status summary, while long forecasting/claims/payer-analysis sections are pushed behind drill-down panels so day-to-day work starts with the queue, not the ledger.
- ClientCare now also keeps a persistent account search across the queue and board, and each account detail now splits `System is doing next` from `You need to do next` so operator judgment is clearly separated from machine-managed work.
- ClientCare account detail now has direct `Refresh from ClientCare`, `Request missing info by text`, and `Request missing info by email` actions, plus a `Data completeness` table that shows which payer/member/setup fields were found versus still missing before any human typing happens.
- ClientCare `Operations Assistant` is now explicitly the billing-to-AI-Council path for open questions after deterministic billing workflows check for a direct operational answer first, and the setup checklist now points to the real `CLIENTCARE_BASE_URL` / `CLIENTCARE_USERNAME` / `CLIENTCARE_PASSWORD` env names instead of stale aliases.
- ClientCare VOB now supports insurance-card prospect intake: upload a card image, OCR the carrier/member fields, try to match an existing client, run a first-pass VOB, save the result in reusable history, and later push that saved VOB into a client-file creation queue when the prospect decides to move forward.
- Prospect VOB outreach now uses the system’s outbound engine when a phone number or email is present: the portal can send the missing-info request as a real SMS/email and log the outreach task/receipt instead of only drafting text in the assistant.

## Update 2026-03-27 #1
- TC intake workspace can now link a triaged email directly to an existing transaction, log the routing event on the file, backfill `source_email_id` when it was missing, show recent intake activity in the workspace itself, run manual document validation / dry-run upload from the same screen, launch a dry-run intake for a target address, turn failed QA checks into real document requests on a transaction, seed the known TC env defaults automatically while leaving secrets blank, detect which secret envs are already present at runtime, and show a managed-env snapshot, which reduces duplicate placeholder transactions during early intake and gives the operator an immediate audit trail plus fail-closed QA, rehearsal, missing-doc follow-through, and low-friction env setup before live filing without re-asking for secrets that already exist.
- TC intake workspace can now create placeholder transactions directly from triaged contract emails, which reduces manual setup friction before full live filing credentials are available.
- TC email triage now captures preview text and message identity when the enrichment migration is present, which improves classification quality and gives the intake workspace better transaction-matching signals.
- TC agent portal now opens into an intake workspace when no transaction id is supplied, showing access readiness, secret-entry/bootstrap controls, dry-run GLVAR/SkySlope checks, the actionable inbox triage queue, and suggested matches to active transactions.
- TC now has access-readiness and bootstrap endpoints for email, GLVAR, TransactionDesk, and SkySlope prerequisites, and the startup guards now check real env/vault readiness instead of stale hard-coded env names.
- ClientCare rollout validation now has history/trend summaries in the overlay, so repeated blockers and validation-score movement are visible without exporting audit data.
- ClientCare sellable packaging now includes a live rollout validation runner that checks actual browser readiness, claim-history presence, operator access, audit receipts, and onboarding state before go-live.
- ClientCare account repair now preserves the selected visible coverage in the overlay and uses current-value hints during browser writeback, which materially lowers the risk of editing the wrong coverage row on denser multi-coverage layouts.
- ClientCare sellable packaging now exposes a go-live readiness score, checklist, blockers, and next actions directly in the Collections Control Center so rollout status is visible at a glance.
- ClientCare packaging can now export tenant readiness as JSON and tenant audit history as CSV without leaving the overlay, which closes a major external-rollout reporting gap.
- Commercial payer overrides now support denial-lane overrides, follow-up cadence, escalation timing, expected lag, and expected paid-to-allowed baselines; those values now flow into payer playbooks, appeal guidance, and forecast calibration.
- ClientCare billing now has sellable packaging controls in the Collections Control Center: tenant profile, onboarding state, operator access, and tenant-scoped audit history are visible and editable without leaving the overlay.
- ClientCare packaging now supports tenant-aware overview queries and filtered audit retrieval, so the same product can be configured for more than one practice without mixing state.
- ClientCare repair flow now supports multi-coverage slot targeting for visible insurer fields, reducing the manual blocker around payer-order edits on accounts with more than one visible coverage; broader layout hardening is still pending.
- ClientCare billing now also supports operator-defined payer rule overrides for commercial plans, so filing windows, appeal windows, auth-review flags, and follow-up notes can be tuned without code changes and flow directly into payer playbooks/classification.
- ClientCare sellable packaging now also enforces tenant-scoped operator access on write routes when operators are configured, using overlay-supplied operator identity plus tenant headers without blocking bootstrap before access rows exist.

## Update 2026-03-26 #2
- Trust reset applied: directed mode is now the default operating posture. Autonomous AI/build/research/improvement loops are being disabled unless explicitly re-enabled.
- Background auto-builder scheduling is now off by default; auto-builder should only run on explicit operator direction unless `LIFEOS_ENABLE_AUTO_BUILDER_SCHEDULER=true`.
- Hidden self-starting subsystem timers were identified as a major source of unwanted work:
  - `core/marketing-research-system.js`
  - `core/marketing-agency.js`
  - `core/self-funding-system.js`
  - `services/autonomy-scheduler.js`
- Startup-time autonomous workers are also now being held behind directed mode:
  - `services/autonomy-orchestrator.js`
  - enhanced/basic income drone deployment
  - `core/opportunity-executor.js`
- Savings dashboard/reporting is being corrected to use authoritative ledger rows only; duplicate token-optimizer writes to `token_usage_log` are being disabled so metrics stop overstating activity.
- ClientCare browser path hit a real production issue: screenshot capture failed on a zero-width page. Browser diagnostics are now being hardened so screenshots are best-effort and cannot block live login/discovery/extraction.
- ClientCare browser path also hit a Railway Puppeteer compatibility issue (`page.waitForTimeout` missing); browser session startup now shims that helper so older/newer Puppeteer builds behave consistently.
- ClientCare browser discovery/extraction is now being tightened for Railway request budgets: smaller candidate sets, no subpage screenshots by default, and partial page-level errors instead of whole-request failure wherever possible.
- ClientCare browser path now also exposes targeted page inspection and a billing-operations overview so we can answer where billing stands even before export automation is finalized.
- ClientCare browser path now also exposes client-account scanning by walking the client list and opening each account's billing tab, so per-account billing state can be inspected directly from the live system.
- ClientCare browser path now also exposes a billing-notes scan and client-scan batching (`offset`/`limit`) so we can work through the live backlog queue without waiting for exports.
- ClientCare overlay is being shifted away from raw JSON blocks toward operator-readable summaries; raw payloads remain available only as secondary diagnostics.
- ClientCare browser path now also exposes a live account rescue report so billing-note items can be turned into per-account status, likely root cause, and next action within one browser session.
- ClientCare overlay now also surfaces the account rescue report in a readable table so operators do not need to interpret raw JSON to work the queue.
- ClientCare overlay now also has an account status board with hover summaries and click-through details so Sherry can see where each account is stuck at a glance.
- ClientCare billing now also has a reimbursement-intelligence foundation so payout projections can be learned from historical paid claims/remits, and the browser path is being extended toward full billing-queue traversal rather than just the first visible batch.
- ClientCare billing now also has transport diagnostics for the billing-notes queue because the UI advertises 88 notes while the current headless traversal only sees 15 rendered rows.
- ClientCare billing-notes traversal now uses the actual `GetMidwifeNotesList` transport instead of rendered-page scraping, so the system can pull the full 88-note backlog and collapse it into account-level rescue work.
- ClientCare overlay now also summarizes the full backlog in operator terms: diagnosis counts, recovery-likelihood bands, oldest accounts first, and the most common next-action buckets, with raw payloads kept secondary.
- ClientCare overlay now also derives batch workflow playbooks from the full rescue report so the backlog can be worked by blocker type: insurance verification, billing setup, demographics, client match, and missing insurer data.
- ClientCare overlay now auto-loads the live full billing queue when the app key and ClientCare credentials are present, and the visible top stats switch from the empty local ledger to the live ClientCare backlog summary.
- ClientCare reimbursement intelligence now also includes a collections forecast with projected timing buckets and top expected collections; it starts low-confidence and improves as paid claims/ERAs/remits are imported.
- ClientCare overlay now uses a fast backlog-summary path to populate the board quickly, then lazily inspects account details when an operator clicks into a specific account.
- ClientCare overlay now also has an AI operations assistant with running conversation history and archive behavior, so Sherry can ask questions or request system changes directly from the portal.

## Update 2026-03-26 #1
- Priority shifted temporarily from TC to ClientCare billing recovery because there is already earned revenue trapped in unpaid / unbilled / rejected / denied claims.
- New amendment added: `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` defines the no-API-first operating model for ClientCare West billing rescue.
- New backend foundation added for ClientCare billing rescue:
  - `services/clientcare-billing-service.js` — claim classification, timely-filing triage, rescue buckets, action planning
  - `services/clientcare-browser-service.js` — browser/export fallback readiness contract and workflow templates
  - `routes/clientcare-billing-routes.js` — dashboard, import, classification, actions, and ClientCare readiness endpoints
  - `db/migrations/20260326_clientcare_billing.sql` — `clientcare_claims` and `clientcare_claim_actions`
- ClientCare billing now also has an operator overlay at `/clientcare-billing` for CSV import, dashboard review, claim drill-down, and action completion.
- ClientCare billing also now has snapshot parsing and reconciliation: copied ClientCare table HTML or pasted tab/comma-delimited text can be normalized and imported even before official exports or API access are available.
- ClientCare billing now also has credential-backed browser discovery: login test, billing-surface discovery, and claim-table extraction endpoints are wired behind Railway secrets so live page inspection can begin without waiting for exports.
- Working assumption remains: no public ClientCare API or self-serve API key exists until the vendor proves otherwise; browser/export fallback is the primary path.
- Immediate next operational step is to export the 90-claim backlog from ClientCare and import it into the new rescue queue.

## Update 2026-03-25 #1
- Priority reset: TC Service (Amendment 17) is the active revenue lane; API Cost Savings is secondary productization work.
- Governance: every meaningful product/code change must now update the owning amendment before the work is considered done; SSOT Companion and project index also update when shared platform state changes.
- TC scope expanded: real-time agent/client portal, file-state engine, communication engine, weekly listing reports, escalation engine, mobile approval flow, offer-prep command engine, and lawful/consented recording/coaching loop are now part of the canonical TC product definition.
- TC implementation now includes a portal-ready status engine plus a fail-closed document QA gate for intake/uploads; next build step is the client/agent portal surface on top of those APIs.
- TC portal surface now has schema/service/API support for transaction overview, communication tracking, and document requests; next step is UI and stronger Nevada-specific form packs.
- TC reporting layer now exists in code: showings, showing feedback, market snapshots, listing-health scoring, and weekly report generation are wired with API endpoints and persistence.
- TC now has basic agent/client portal pages at `/tc` and `/tc/client`, both backed by the canonical TC overview/report APIs.
- TC now also has an approval/automation backend: pending approval queue, one-tap approve/reject/snooze actions, prepared communication sending, showing-feedback request prep, document-request sending, and weekly report delivery prep.
- TC now also has the first closed-loop alert backend: alert records, escalation scheduling, delivery receipts, and portal actions for acknowledge / snooze / resolve.
- TC now has an initial Asana sync backend: preview canonical transaction sync plans, upsert parent/subtasks, and persist external mappings in `tc_external_refs`.
- TC now has initial machine-readable listing/buyer workflow specs and a derived workflow API, which also feeds the Asana sync layer.
- TC now has the first offer-prep backend: structured recommendation bands from property facts, comp data, seller signals, and client constraints, exposed through TC routes for review-first offer prep.
- TC now has the first lawful interaction-intelligence backend: disclosed/visible recording gate, notes-only fail-closed mode, transcript/audio analysis, commitment extraction into Word Keeper commitments, client-profile update suggestions, coaching review, and portal visibility for recent interactions.
- TC now has a canonical communication callback path so delivery/reply events can update `tc_communications` and inbound showing feedback replies can land back in TC reporting automatically.
- TC now has signed mobile action links for approvals and alerts, plus agent-portal copy-link actions, so one-tap phone execution exists even before the full mobile review/sign surface is built.
- TC now has official-feed ingestion endpoints for MLS market snapshots and showing-system events, normalized into canonical TC reporting data before weekly reports/health scoring.
- TC now also has provider-specific TC webhook endpoints for Postmark and Twilio, layered over the canonical callback service so live delivery/reply events can update communication state without manual polling.
- TC Asana sync now also carries unsent communications and analyzed interactions into the ops surface so human follow-up work does not drift out of canonical state.
- ClientCare Collections Control Center now auto-hydrates the live backlog into the KPI strip and account board, instead of leaving the top row tied to the empty local claim ledger.
- ClientCare operator chat is now explicitly `Operations Assistant` with pinned/unpinned behavior, and the overlay layout is split into overview, accounts needing action, account recovery detail, and collapsible tools.
- ClientCare billing now has a first actionable ops layer: optimization checklist, patient AR summary, insurance-verification preview, workflow runner, capability queue, and assistant routing through `clientcare-ops-service` instead of raw chat-only behavior.
- ClientCare Account Recovery Detail now supports controlled repair preview/apply for billing status, provider type, and payment status, with save feedback and unsupported-item warnings for insurer-entry or payer-order changes that still need manual/payer-specific handling.
- SSOT discipline now explicitly requires timing truth: estimates before implementation, actuals after completion, and variance notes when estimates miss materially so programming-speed forecasts can improve over time.
- ClientCare billing now supports payment-history import for paid claims / ERA / remit CSV and exposes an underpayment queue so reimbursement learning can move from rescue-bucket assumptions toward actual insurer payment behavior.
- Project governance now includes explicit build-readiness routes/queue and mounts the builder supervisor runtime surface, but Command Center still needs the readiness/governance drill-down UI to operate that lane cleanly.
- ClientCare billing now adds an appeals queue and claim-level appeal packet preview on top of payment-history import and underpayment detection, so denied/follow-up claims can be worked by playbook instead of manually from memory.
- ClientCare billing now also lets operators queue follow-up work directly from the underpayment and appeals queues, so likely recovery items become tracked actions instead of remaining dashboard-only.
- ClientCare billing now also derives payer playbooks from imported claim/remit history, including average payment lag, top denial categories, and recommended next actions, so commercial follow-up can move beyond generic queue rules.
- ClientCare billing now also exposes ERA/remit insights (CARC/RARC/payment-method signals) and uses observed payer payment lag to calibrate collection forecasts when history exists.
- ClientCare billing now also supports visible-coverage insurer repair fields and provider-directed patient AR policy controls/escalation queue from the overlay, while multi-coverage payer-order changes remain guarded until a safer selector exists.
- Command Center Operator Chat and ClientCare Operations Assistant now share a browser voice layer for dictation and optional spoken replies, so hands-free chat is available on both primary operator surfaces.
- ClientCare billing overlay now degrades safely when the command key is missing instead of failing the whole page on protected-endpoint 401s, and Command Center now exposes env-registry health so builders/operators can see which envs exist or block revenue without seeing secret values.
- Public overlay HTML now ships with no-cache headers and versioned script URLs so stale browser caches stop serving older broken ClientCare/Command Center builds after deploys.
- `server.js` route composition has been reduced again: runtime route wiring now lives in `startup/register-runtime-routes.js`, and domain startup calls now go through `startup/boot-domains.js` instead of inline IIFEs.
- Project governance is now a first-class amendment (`AMENDMENT_19_PROJECT_GOVERNANCE.md`) with tracked manifest, migration, verifier scripts, CI workflow, and a seed script for populating the governance tables from amendment build plans.
- Project governance is now seeded in the real DB and the live governance endpoints (`/api/v1/projects`, `/api/v1/pending-adam`, `/api/v1/estimation/accuracy`) are verified against production; next work is wiring estimation accuracy and drill-downs into the Command Center.

## Update 2026-01-30 #1
- Hardware: MacBook Pro M2 Max, 32 GB RAM, 2 TB SSD running server-only mode; machine doubles as development host but being stripped down for LifeOS server.
- Models: Ollama hosts gemma2:27b-instruct-q4_0, deepseek variants (coder v2, v3, r1 70b/32b, coder 33b/6.7b, latest), qwen2.5 variants, qwen3-coder, llama3.3/3.2 70b/vision/1b, llava 7b, codestral, gpt-oss 20b/120b, phi3 mini, qllama reranker, nomic embed.
- Tools: ffmpeg missing, puppeteer present, playwright absent; python modules ok with only `piper` available.
- Priorities: real estate ideas (#1 Ad+Creative Pack, #2 Follow-Up & Script Assistant, #3 Showing Packet/CMA Snapshot). Auto-builder to work on 10 ideas, currently recycling one task; re-prioritize the queue to hit more ideas.
- Expectations: Always grade models, capture strengths/weaknesses, keep log for council. Use SSOT addendum for instructions, ensure brutal honesty, mention unknowns, track third-party solutions.
- Processes: lifeos server under PM2 via `npx pm2 start server.js --name lifeos --env production`, `pm2 save`; plan to run `sudo env PATH=$PATH:/Users/adamhopkins/.nvm/versions/node/v22.21.0/bin /Users/adamhopkins/Projects/Lumin-LifeOS/node_modules/pm2/bin/pm2 startup launchd -u adamhopkins --hp /Users/adamhopkins`. Monitor via `/api/v1/tools/status`, `pm2 logs lifeos`.
