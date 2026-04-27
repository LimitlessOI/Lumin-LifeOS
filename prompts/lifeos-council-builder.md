# Domain: Council Builder (Coworker Architecture)

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md) — Never lie. Never let Adam operate on a misunderstanding: **correct him the instant** you see it. He does not know what he does not know — **fill every gap**. Before editing `AMENDMENT_21`, read the **entire** file this session (`CLAUDE.md` → SSOT READ-BEFORE-WRITE).  
> **Then:** [`00-SSOT-READ-SEQUENCE.md`](00-SSOT-READ-SEQUENCE.md) (read order) + [`00-MODEL-TIERS-THINK-VS-EXECUTE.md`](00-MODEL-TIERS-THINK-VS-EXECUTE.md) (think vs execute tiers).

**Last updated:** 2026-04-25 — **Conductor does not hand-edit implementation** (including this route file): use **`POST /api/v1/lifeos/builder/build`** with domain `lifeos-council-builder` (or appropriate) + `target_file`; **`GAP-FILL:`** only after logged failed `/build`. Architecture diagram updated (system commits). Prior: 2026-04-19
**SSOT:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
**Owning routes:** `routes/lifeos-council-builder-routes.js`
**Mounted at:** `/api/v1/lifeos/builder`
**Config:** `config/task-model-routing.js`

---

## What This Domain Does

This is the "coworker" bridge. **Conductor** reads SSOT, dispatches **`POST /api/v1/lifeos/builder/task`** (review/plan) or **`POST /api/v1/lifeos/builder/build`** (generate + **GitHub commit** via `commitToGitHub`) or **`POST …/execute`** after review. **The system is the author of committed product and builder implementation code** — the Conductor **grades output, tightens spec, re-runs, opens gate-change**; **does not** replace the council by hand-editing those files except documented **`GAP-FILL:`** after a **failed** `/build` attempt.

When Cursor hits a usage limit, **SSOT + `data/builder-preflight-log.jsonl` + Change Receipts** carry state forward.

---

## The Architecture

```
Conductor (Cursor / automation)
  1. Read SSOT + `docs/BUILDER_OPERATOR_ENV.md` — export keys into shell from Railway
  2. `npm run builder:preflight` (appends machine log line)
  3. POST /api/v1/lifeos/builder/build { domain, task, spec, files?, target_file, commit_message: "[system-build] …" }
  4. Railway council generates → commitToGitHub pushes → deploy
  5. Conductor verifies, updates Change Receipts (model_used, grade, residue risk)

AI Council (Railway) = implementation worker
  • Reads domain prompt + optional injected repo files (`files[]`)
  • Returns code / plan / review; `/build` path commits without Conductor pasting code in IDE
```

---

## API Surface

```
GET  /api/v1/lifeos/builder/ready           server truth: commit path, council, pool, GITHUB_TOKEN, auth mode (use before /build)
GET  /api/v1/lifeos/builder/domains         list available domain prompt files
GET  /api/v1/lifeos/builder/domain/:name    read a specific domain prompt file
GET  /api/v1/lifeos/builder/next-task       machine-readable cold-start snippets + read order
POST /api/v1/lifeos/builder/task            dispatch a task to the council (optional `---METADATA---` JSON placement tail)
POST /api/v1/lifeos/builder/review          ask council to review code/diff
GET  /api/v1/lifeos/builder/model-map       show task-to-model routing table
GET  /api/v1/lifeos/builder/lcl-stats       LCL drift dashboard
POST /api/v1/lifeos/builder/execute         apply code + commit via GitHub (Conductor or system)
POST /api/v1/lifeos/builder/build           full generate + commit (§2.11 system author) — use `npm run builder:preflight` first
```

Local: `npm run builder:preflight` → same checks as a cold start against `GET /ready` + `GET /domains`.

`POST /task` autonomy toggles:
- `autonomy_mode`: `"max"` (default) or `"normal"`
- `internet_research`: `true` (default) or `false`
- `execution_only`: `true` or `false` (default) — when `true` with `mode: "code"` and **no** body `model` override, routes to **`council.builder.code_execute`** (`groq_llama`): **literal** implementation of the given `spec` + `files[]`. Use **only** after a **plan** or Conductor-approved spec; do **not** use for huge HTML overlays until you’ve verified Groq passes validators.

In `"max"` mode the council is instructed to make best-guess assumptions and continue without routine clarification loops, stopping only for hard blockers (credentials/external system absence/high-risk authorization).

**Related (§2.6 ¶8 gate-change queue):** `/api/v1/lifeos/gate-change` — see `prompts/lifeos-gate-change-proposal.md` and `routes/lifeos-gate-change-routes.js`.

---

## Task Dispatch Format

```json
POST /api/v1/lifeos/builder/task
{
  "domain": "lifeos-conflict",
  "task": "Build detectEscalationInText() for the Conflict Interruption System",
  "spec": "Full spec from AMENDMENT_21 Conflict Intelligence item 1...",
  "files": ["services/conflict-intelligence.js"],
  "mode": "code"
}
```

`mode` options:
- `"code"` — full implementation, ESM, follows existing patterns
- `"plan"` — step-by-step plan with file names + schemas, no code
- `"review"` — review code/diff for bugs + drift

---

## Model Routing (`config/task-model-routing.js`)

All mapped models are free. Policy: **think** (plan, review, ambiguous codegen) → stronger reasoning; **execute** (frozen spec) → fast literal emit.

| Task type | Model | When |
|---|---|---|
| `council.builder.plan` | `gemini_flash` | Architecture / steps / file touch list |
| `council.builder.review` | `gemini_flash` | Judgment, drift, bugs |
| `council.builder.code` | `gemini_flash` | Default codegen (open scope or large outputs) |
| `council.builder.code_execute` | `groq_llama` | `mode: code` + `execution_only: true` + no `model` override |
| Classification / extraction (other tasks) | `groq_llama` | Structured, low ambiguity |
| Complex on-demand | `ollama_deepseek_v3` | Local, heavy reasoning |

Override anytime with `"model": "<council_member_key>"` in the task body.

**Two-call pattern:** `mode: plan` (think) → tighten `spec` → `mode: code` + `execution_only: true` (execute) when safe.

---

## How Cursor Limits Are Overcome

The SSOT is the memory that survives all token limits:
1. `prompts/<domain>.md` — 30-second context brief per domain
2. `AMENDMENT_21_LIFEOS_CORE.md → Agent Handoff Notes` — exact current build state
3. `docs/CONTINUITY_LOG.md` — running session log, most recent entry at top

**Session start ritual (takes < 2 min):**
1. `GET /api/v1/lifeos/builder/domains` — see what context files exist
2. `GET /api/v1/lifeos/builder/domain/lifeos-conflict` — read domain you're working on
3. Check AMENDMENT_21 handoff notes for priority queue
4. Begin dispatching tasks

---

## Next Approved Task

No next task for the builder infrastructure itself — it's complete. Use it to build:
1. **Conflict Interruption System** → domain: `lifeos-conflict`, mode: `code`
2. **Habit Tracker** → no domain file yet, create `prompts/lifeos-habits.md` first
3. **Legacy Core** → no domain file yet, create `prompts/lifeos-legacy.md` first
