# QUICK LAUNCH — Conductor Start

**Platform:** **TokenSaverOS (TSOS)** — this repo. **#0 product priority** is **refine the builder** and prove the pipeline (North Star **Article II §2.11a**, Companion **§0.5F**). **Separately**, how the Conductor **evaluates work and reports to you** is **Article II §2.11b** + Companion **§0.5G** — that is *not* the TSOS name; it is the **session report** (grade, why A vs B, residue risk) so you are not code-reviewing at scale by intuition. **Do not conflate** “we build the builder first (§2.11a)” with “here is how I tell Adam what happened (§2.11b).”

Use this file when a new AI needs to take over fast and continue without re-explaining context.

## One-line Command (for Adam)

Read `docs/QUICK_LAUNCH.md` and run in conductor mode: follow SSOT, pick up from latest handoff, execute end-to-end, verify, update receipts/logs, then continue to the next queued task without routine technical questions.

## NSSOT shorthand (preferred)

If Adam says **"read NSSOT"**, interpret it as: **run the same path as the Required Read Order below** — for **normal** sessions that means **`docs/AGENT_RULES.compact.md` first** (enforcement packet), not necessarily pasting 300 lines of full North Star + Companion into context.

**Full** `docs/SSOT_NORTH_STAR.md` + `docs/SSOT_COMPANION.md` (including **§2.10–§2.12**, **§0.5A / §0.5C / §0.5D**) are required when: editing a constitutional file, a constitutional conflict, or first-time onboarding — see the block *Full read required* under Required Read Order.

Then: read this file (`docs/QUICK_LAUNCH.md`) for lane routing and execution, and follow the lane table below.

**Builder env (names only, no secrets in git):** `docs/BUILDER_OPERATOR_ENV.md` — operator exports Railway-matching vars into the shell before `npm run builder:preflight` or `POST /api/v1/lifeos/builder/build`. **Before any “env is missing” claim:** `docs/ENV_DIAGNOSIS_PROTOCOL.md` + `docs/ENV_REGISTRY.md` deploy inventory (North Star **§2.3**).

**Remote-system truth:** the live system is **GitHub + Railway + Neon**. Local repo/shell/.env are operator workbench mirrors only. Never describe a local condition as “the system state” unless you say it is local.

**What the system can do (vs gaps):** `docs/SYSTEM_CAPABILITIES.md` — Railway redeploy (`npm run system:railway:redeploy`), env list, builder `/build`, verifiers; **update that doc + `ENV_REGISTRY.md` when you add ops**. Changelog lives at the bottom of the capabilities file.

**Whole-repo file inventory (cleanup / drift):** `docs/REPO_CATALOG.md` — run `npm run repo:catalog` after large tree changes; human triage in `docs/REPO_TRIAGE_NOTES.md`. Pointers also in `docs/projects/INDEX.md` and `docs/CONTINUITY_INDEX.md`.

**What actually runs vs barnacles:** `docs/REPO_DEEP_AUDIT.md` — composition spine (`server.js` → `startup/register-runtime-routes.js`), value tiers, cleanup waves.

**Map of all indexes:** `docs/REPO_MASTER_INDEX.md` — inventory + SSOT + continuity + prompts in one hub.

## Required Read Order (do not skip)

> **Token-efficient path (normal build sessions):**
> Read `docs/AGENT_RULES.compact.md` INSTEAD of full NSSOT + Companion (~800 tokens vs ~8000+).
> Full NSSOT required ONLY when: editing constitutional docs, constitutional conflict, first-time onboarding.

1. **`docs/AGENT_RULES.compact.md`** — compressed enforcement packet (replaces NSSOT + Companion for normal sessions)
2. `prompts/00-LIFEOS-AGENT-CONTRACT.md`
3. `docs/CONTINUITY_INDEX.md`
4. `docs/AI_COLD_START.md`
5. `docs/CONTINUITY_LOG.md` (latest update first)
6. `docs/CONTINUITY_LOG_LIFEOS.md` (latest update first)
7. `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`:
   - `## Agent Handoff Notes`
   - latest 3–5 rows in `## Change Receipts`

> **Full read required for:** `docs/SSOT_NORTH_STAR.md` + `docs/SSOT_COMPANION.md`
> Only when editing constitutional docs, constitutional conflict, or first-time onboarding.

## Lane Router (what to read next by project)

- **LifeOS lane**
  - `docs/CONTINUITY_LOG_LIFEOS.md`
  - `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
  - `prompts/lifeos-*.md` relevant to the task
- **TC lane**
  - `docs/CONTINUITY_LOG_TC.md`
  - `docs/projects/AMENDMENT_17_TC_SERVICE.md`
  - `docs/CONTINUITY_LOG_COUNCIL.md` (if task touches council/model routing)
- **Council lane**
  - `docs/CONTINUITY_LOG_COUNCIL.md`
  - `docs/projects/AMENDMENT_01_AI_COUNCIL.md`
- **Cross-cutting**
  - `docs/CONTINUITY_LOG.md` + the owning amendment for touched files

If task lane is unclear: read `docs/CONTINUITY_INDEX.md`, choose lane, then proceed.

## Conductor Roles

- **SSOT (brain/blueprint):** Source of truth and build order.
- **AI agent (hands/conductor):** **Per North Star Article II §2.11–§2.12** you are **Conductor** (this protocol) or **Construction supervisor** (segment-scoped). You **code the system (platform) only** — **gaps**, **breakage**, or documented **`GAP-FILL:`** (small or **extensive**) so **Lumin** can do what a Conductor could do in an IDE. You **do not** hand-implement **amendment or project** *product* in source; the **system programs** that. If blocked, **platform** fix or **HALT** — not shadow project work. **Load-bearing technical decisions** (architecture, security, integration strategy, hard-to-reverse forks): **council** + best-practice input + **receipts**; if models disagree, **full** debate protocol — not single-model **decree**. **Every session:** re-read this launch order + **Continuity** + **owning amendment**; **before done:** verifiers / reality match receipts (**anti-drift**).
- **Lumin/system (engine/orchestra):** Runtime execution path and APIs; **author** of **amendment and project** product over time. **Conductor** codes **only** the **platform** (gaps/breakage) or **`GAP-FILL`**, not the **project** as a substitute.

## Execution Protocol

1. Read files in required order (North Star **§2.10** is part of “done”: no ship without observe/grade/verify/receipt path for the change class).
2. Pick top queued task from handoff (`Agent Handoff Notes`).
3. **BUILDER-FIRST + PREFLIGHT (§2.11 / §2.11a — non-optional):**
   - Run: `npm run builder:preflight` (fails with **actionable** errors if URL/keys/`GITHUB_TOKEN`/server down)
   - Verify builder: `GET /api/v1/lifeos/builder/ready` + `GET /api/v1/lifeos/builder/domains` when the API is up
   - If the task is product code: `POST /api/v1/lifeos/builder/build` with domain + spec + `target_file` as appropriate; `[system-build]` in commit
   - **Lumin chat overlay (system build):** `npm run lifeos:builder:build-chat` (wraps `POST …/builder/build` for `public/overlay/lifeos-chat.html`). **`--dry-run`** prints the JSON body. If **`GET …/builder/domains` returns 404**, production is behind `main` — **redeploy Railway** until `/domains` returns 200, then re-run.
   - On failure: `GET /api/v1/lifeos/builder/gaps`; the returned gap becomes the next platform fix. **GAP-FILL:** exact reason; **do not** pretend the system built it. Fix platform in-session when possible
   - See `CLAUDE.md → ## BUILDER-FIRST RULE`
   - **Machine channel (North Star §2.14):** For **receipt-grade** first lines to/from builder HTTP, preflight, redeploy, and `env:certify`, use **only** the tokens/templates in **`docs/TSOS_SYSTEM_LANGUAGE.md`** (`[TSOS-MACHINE]` / compact `TSOS|` lines). **Does not replace** step 4 — Adam still gets **§2.11b** plain language.
4. **Conductor → Adam report (§2.11b / Companion §0.5G) — if this slice needs you to trust quality without reading every line** (required when the slice **touched the builder, builder output, or build pipeline**; also use for other high-stakes product slices you directed): plain-language **what we did**, **quality score (e.g. 6→9) with evidence**, **why this vs that** if there was a fork, **what’s still not proven**. **This step is *not* §2.11a (TSOS)** — it is the **reporting** layer.
5. Verify (syntax/lint/verify scripts) — failed verify → **repair loop** until honest pass or named HALT (Companion §0.5A / North Star §2.10).
6. Update SSOT receipts + continuity logs.
7. Continue to next queued task.

## Real multi-model AI Council (this is not the IDE chat)

**KNOW:** A single model in Cursor/Claude/ChatGPT **cannot** invoke your **deployed** multi-model `callCouncilMember` graph. “**Synthetic consensus**” in a chat = one model’s **guess** at what a panel **might** agree on — it is **not** a recorded `run-council` result.

**Real debate** (round 1 + **opposite-argument** round 2 on disagreement) is implemented at **`POST /api/v1/lifeos/gate-change/proposals/:id/run-council`** — see `routes/lifeos-gate-change-routes.js`, `docs/projects/AMENDMENT_01_AI_COUNCIL.md`, North Star **§2.6 ¶8** / **§2.12**.

**To run a real council (costs API tokens; debate runs on the **server** with Railway’s model keys when you use `--preset` or `POST /run-preset` — you only need **`COMMAND_CENTER_KEY` + `PUBLIC_BASE_URL`**, not local Groq/Gemini keys):**
```bash
export PUBLIC_BASE_URL="https://YOUR-DEPLOY"
export COMMAND_CENTER_KEY="(same as Railway requireKey)"
npm run lifeos:gate-change-run -- --preset maturity
# Program kickoff: have models review `docs/SYSTEM_MATURITY_PROGRAM.md` intent:
npm run lifeos:gate-change-run -- --preset program-start
# List preset keys (no API key required):
npm run lifeos:gate-change-run -- --list-presets
# or: node scripts/council-gate-change-run.mjs --title "..." --file path/to/pain.md
# HTTP: GET /api/v1/lifeos/gate-change/presets (`x-command-key` **or** LifeOS admin JWT — Settings panel uses JWT)
```

Then `GET` the proposal by id to read `council_rounds_json` and receipts. **Chat alone is not a substitute** for this when North Star / §2.12 requires council review.

**Before large merges / “we’re at 10” claims:** `npm run verify:maturity` (local; full `lifeos-verify` when `DATABASE_URL` + keys in shell). CI runs the same in **skip-lifeos** mode; operators still owe a **full** `lifeos-verify` with production-class env.

## When you send the Conductor to get the system building (for Adam)

Tight, low-drift sends:

- **One scope** — one lane (LifeOS, TC, …) and one clear outcome (“wire migration X,” “fix builder preflight for Y”) instead of a vague “do everything.”
- **Show env that matters** — for builder/council: `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY` in the shell; for DB-backed verify: `DATABASE_URL` when the task needs it. If missing, expect **HALT** or **honest GAP-FILL**, not shadow coding.
- **Expect the machine path** — preflight → `POST /builder/build` (or GAP-FILL: reason) → verify. **“I couldn’t”** must name **why** (blocked key, red `/ready`, etc.).
- **Expect a written close** per **§2.11b / §0.5G** — not cheerleading; if quality is **bad**, the report says **bad** and what was verified.
- **Expect the ask to be followed** — North Star **§2.15** + Companion **§0.5I**: if your instruction is unambiguous, the Conductor **does that** or **HALT**s with a **named** blocker. **INTENT DRIFT** (they built something else) must appear in the **§2.11b** close, not only in file history. Paper law cannot “compile” a remote LLM — receipts make drift **visible**.
- **Expect the Conductor to supervise the system, not replace it** — North Star **§2.11c** + Companion **§0.5D** *Supervisor mandate*: product slices go through **`POST /api/v1/lifeos/builder/build`** (after preflight), then **audit** + optional **council review**; **§2.11b** must say what the system was trying to do, where it would fail, and what **platform** GAP-FILL happened. **Not:** IDE-authoring the same feature because Cursor feels faster. **Registry:** `docs/ENV_REGISTRY.md` before “env missing” noise; **404 `/domains`** = **redeploy** / deploy drift, not a lecture at you.
- **Parallel work** — two AIs: different files/lanes; one owner if overlap. See *Parallel Conductors* below.
- **Decisions** — if the send is “you choose architecture,” that is a **council** moment (**§2.12**), not a silent pick.

## Parallel Conductors (2 AIs at once)

Allowed pattern:
- Conductor A owns one lane (e.g., LifeOS)
- Conductor B owns another lane (e.g., TC)
- Each updates only its lane log + owning amendment receipts

Non-negotiables:
- Do not edit the same file in both lanes simultaneously.
- If overlap is required, designate one conductor as owner; the other waits/rebases.
- Every handoff updates this file + lane log + amendment receipts.

## Current Priority Queue (update each session)

**Note:** Items 1-3 from prior queue were completed 2026-04-20 (#16 LifeOS lane). Queue updated **2026-04-25** — **P0 = TokenSaverOS builder (§2.11a)**; **Conductor → Adam report = §2.11b / §0.5G** (separate).

0. **TSOS — builder path + pipeline integrity (constitutional P0, §2.11a)** — `npm run builder:preflight`; when ready, governed **self-build** of the pipeline. **Session reporting** to Adam (grade, why, residue risk) is **§2.11b** / **§0.5G** — not a second name for TSOS. See `docs/SSOT_COMPANION.md` **§0.5F** (builder) and **§0.5G** (reporting). **Do not** starve this lane for unverified feature churn.
1. **TokenOS first-customer verification** — migration auto-applies on next Railway deploy; after deploy: `POST /api/v1/tokenos/register` → make test proxy call → verify `tco_requests` row created with savings > 0 → open `/token-os/dashboard`. See `AMENDMENT_10_API_COST_SAVINGS.md → ## Agent Handoff Notes`.
2. **E2E household invite test** — admin creates invite → open in private window → register Sherry (test user) → confirm `lifeos_role` admin panel appears for adam only. (See `CONTINUITY_LOG_LIFEOS.md` #14)
3. **Ambient migration** — `db/migrations/20260423_lifeos_ambient_snapshots.sql` — confirm applied on Neon; smoke: enable ambient in Settings → confirm `GET /api/v1/lifeos/ambient/recent?user=` returns rows. (See `CONTINUITY_LOG_LIFEOS.md` #15)
4. **TokenOS Stripe billing** — `GET /api/v1/tokenos/invoice/:year/:month` returns data; wire Stripe charge on invoice approval. See `AMENDMENT_03_FINANCIAL_REVENUE.md`.
5. **TC lane** — next code slice: first-file intake / portal polish / document QA (see `docs/CONTINUITY_LOG_TC.md` + Amendment 17 **Agent Handoff Notes**).

## Session Update Contract (mandatory)

When any build work ships, update this file before handoff:
- Refresh `Current Priority Queue`.
- Add one bullet under `Latest Completed`.
- Confirm next AI read order still valid.

## Latest Completed (update each session)

- **Article II split + QUICK_LAUNCH (2026-04-25):** **§2.11a** = TSOS + builder P0; **§2.11b** + Companion **§0.5G** = Conductor → Adam evaluation/reporting (orthogonal). `QUICK_LAUNCH` open + execution step 4 + new section *When you send the Conductor…*; `SSOT_COMPANION` **§0.5F/§0.5G**; `generate-agent-rules` + `AGENT_RULES.compact.md`. See `AMENDMENT_21` Change Receipts.
- **TokenSaverOS (TSOS) in NSSOT (2026-04-24):** North Star **§2.11a** (builder = meta-product); reporting obligations clarified in **§2.11b** (2026-04-25); governed self-build; Companion **§0.5F**; P0 queue item 0; `generate-agent-rules` + `AGENT_RULES.compact.md` updated. See `AMENDMENT_21` Change Receipts.
- **QUICK_LAUNCH drift corrected (2026-04-22):** Priority queue updated — cycle/habits/legacy overlays were already shipped 2026-04-20 (#16). New queue reflects actual open items.
- **TokenOS B2B product layer:** DB migration (`tco_customers` + `tco_requests` tables), quality-check service (TCO-C01/C02), core service, full API routes, landing page (`/token-os`), client dashboard (`/token-os/dashboard`). `POST /api/v1/tokenos/proxy` live (`2026-04-22` — see `CONTINUITY_LOG.md` #52, `AMENDMENT_10_API_COST_SAVINGS.md`).
- **LifeOS household invites + auth UX:** API `signup_url`, admin **Household invites** in app Settings, JWT role/tier sync in bootstrap, login `?code=` / banner, Lumin observation-grounded relational prompt line, sign-out clears JWT (`2026-04-20` — see `CONTINUITY_LOG_LIFEOS.md` #14).
- **Cycle tracking backend** fully shipped: migration, service, routes, prompt file, mounted — `/api/v1/lifeos/cycle` live (`2026-04-19`).
- TC lane continuity: `docs/CONTINUITY_LOG_TC.md` structured handoff + Amendment 17 **Agent Handoff Notes (TC lane)** + Owned Files synced to manifest (`2026-04-20`).
- Conflict interruption system + settings controls in chat shipped.
- Habits API lane shipped (`/api/v1/lifeos/habits`).
- Legacy core API lane shipped (`/api/v1/lifeos/legacy` trusted contacts/cadence/time-capsule/digital-will/completeness).
