# LifeOS shell + platform — graded pass (live browser + probes)

**Date:** 2026-05-08  
**Evidence:** MCP browser snapshots on **`https://robust-magic-production.up.railway.app`**; `curl` to **`/api/v1/lifeos/builder/ready`**; local **`npm run lifeos:supervise:static`** earlier in pipeline work. **`lifeos:operational-grade`** was **not** re-run here (sandbox missing **`COMMAND_CENTER_KEY`**).

**Scale:** **1 = failing / dishonest**, **10 = exemplary / receipts green across the board.**

| Area | Score | Why this score | To reach **10** |
|------|-------|----------------|-----------------|
| **Deploy heartbeat** (`/healthz`) | **9** | **KNOW:** 200, page loads | Add explicit JSON contract + alerting hook if absent |
| **LifeOS shell** (`lifeos-app.html`) | **8** | Loads; nav + Lumin affordances visible in a11y tree | Visible **text labels** beside emoji nav (a11y + clarity); tighten settings prompt flow for automation |
| **Dashboard** (`lifeos-dashboard.html`) | **8** | Loads; MIT + dual Lumin entry points surfaced | Landmark / heading semantics in snapshot sparse — improve structure for SR + QA |
| **Security posture (builder API)** | **9** | **`/builder/ready` → 401** without key (**KNOW:** correct fail-closed) | Document operator-only matrix in overlay footer already — keep synced |
| **Console / production hygiene** | **6** | **KNOW:** `cdn.tailwindcss.com` warns **should not be used in production** on shell + dashboard | **Build Tailwind** (CLI/PostCSS) or ship purged CSS — remove CDN dependency |
| **End-to-end test posture** | **6** | Local **`npm test`** passes with skips when offline; no full Playwright against prod in CI **KNOW** | Golden Playwright lane: **`lifeos-app` → iframe dashboard → smoke API** (vault idea #14 class) |
| **Operational-grade automation** | **6** | Not executed this session sans keys — **honest gap** | Adam exports keys → **`npm run lifeos:operational-grade`** + file receipt |
| **SSOT ↔ operator clarity** | **9** | Recent plain-language backlog + brainstorm entry (**KNOW**) | Manifest coupling always pair **`AMENDMENT_21`** + **`manifest.json`** edits |
| **Builder throughput instrumentation** | **9** | Throughput meter + receipts exist | Keep **`--write-receipt`** ritual after slabs |
| **Brainstorm continuity** | **8** | New **`OPERATOR_BRAINSTORM_SESSION_ENTRY.md`** + session folder (**KNOW**) | Maintain **`50_TRIAGE`** + vault links each session |

**Composite opinion (weighted human judgment, not maths): ~7.5 / 10** — shipped surfaces are **credibly alive**; deductions are **CDN production warning**, **incomplete graded automation sans keys**, and **thinner WCAG-visible structure** in snapshots.

---

## Fixes applied this pass

- Documentation + **`OPERATOR_BRAINSTORM_SESSION_ENTRY.md`** (+ protocol hooks) — no Tailwind refactor (multi-file / build infra — queue as **BUILD_NOW** spike).
