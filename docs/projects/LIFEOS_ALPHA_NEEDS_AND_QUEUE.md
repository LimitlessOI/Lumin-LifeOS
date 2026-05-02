# LifeOS alpha — needs assessment & queue rationale

**Updated:** 2026-05-05  
**Authority:** `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md`, `docs/LIFEOS_PROGRAM_MAP_SSOT.md`, operator directive (**LifeOS P1**)

## Needs assessment (supervisor-authored, today)

**Operator goal:** A **prototype Adam can drive today** — open the shell, land on dashboard, sign in when required, reach Lumin/chat without fighting broken chrome.

| Need | NOW (alpha) | Later |
|------|-------------|-------|
| **Shell + routing** | `lifeos-app.html` + iframe dashboard path works on deployed base URL | IA polish vs every mockup pixel |
| **Dashboard body** | `lifeos-dashboard.html` loads; widgets/API errors fail soft, not blank shell | Density modes, category expansion stack |
| **Identity** | Login / token path documented; known env keys set on Railway | Full SSO polish |
| **AI surface** | Lumin reachable from shell + rails that exist (tokens + rail CSS/JS **already linked** on disk) | Full contract in `DASHBOARD_AI_RAIL_CONTRACT.md` |
| **Integrity** | No SSOT drift: don’t rerun “create tokens rail” specs ahead of observable UX gaps | Wave-4 doc specs as scheduled |

## Why the queue moved

Older array order assumed **foundation files did not exist** — they **do** in repo (**`lifeos-dashboard-tokens.css`**, **`lifeos-dashboard-ai-rail.css|.js`** linked in **`lifeos-dashboard.html`**). Leaving those tasks at the front risked **wasted `/build`** tokens or thrashing large HTML for no user-visible gain.

**New order:**

1. **Consensus + operator one-liner** (builder-maintainable Markdown) — needs assessment, dual-AI rule, bookmarks.
2. **Spec backlog** toward alpha UX (density, customization, stubs, a11y, loading, Wave-4 drafts).
3. **Tail:** former “wave 1 emits” (**audit**, **tokens**, **rail** codegen) — refreshes **only after** tangible alpha specs or deliberate supervision.

Cursor file does **not** auto-reset: after pulling this reorder run:

`npm run lifeos:builder:queue:reset-cursor` (then **`BUILDER_QUEUE_MAX=1`** `npm run lifeos:builder:queue`; see **`BUILDER_QUEUE_SLICE_POLICY.md`**)

## Two-AI minimum consensus (enforceable pattern)

Per **`docs/projects/AMENDMENT_01_AI_COUNCIL.md`** and **`docs/AI_COLD_START.md`**, IDE chat is **never** authoritative “multi-model consensus.”  

**Minimal pair**

1. **Supervisor / Conductor (IDE)** — reads repo, edits queue, forbids hallucinated DONE, aligns SSOT ↔ code (**`SUPERVISION_CODE_READ_CONTRACT.md`**).
2. **Railway council** — `npm run lifeos:gate-change-run -- --preset maturity` (or `program-start`) with **`PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY`** exported — **real multi-provider call** against running app env.

Serious dissent on backlog order → **preset or proposal + `run-council`**, receipt in **`## Change Receipts`**.

## Tangible checks today (Adam)

```bash
npm run builder:preflight
npm run lifeos:supervise:static
npm run lifeos:operational-grade
```

Then open **`/overlay/lifeos-app.html`** and **`/overlay/lifeos-dashboard.html`** on your deployed host (substitute **`{{PUBLIC_BASE_URL}}`** mentally).

Canonical machine queue remains **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`**.
