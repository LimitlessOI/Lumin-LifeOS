# System Maturity Program — path to exceptional (10/10) operations

**SSOT position:** This program implements North Star **Article II §2.10** (observe → grade → fix) and **§2.12** (council for load-bearing technical decisions) at the **platform** level. It does not replace per-amendment backlogs; it **coordinates** them.

**Purpose:** Move every “aspect” of the running system from **measured** current state to **receipted** near-10/10, using **verifiers** + **real council** (`POST /api/v1/lifeos/gate-change/.../run-council`) — not single-IDE chat.

**Rule:** *Better than one model* means **recorded** multi-model debate + **CI** that fails when we regress — not optimism.

---

## Aspects, targets, and “done for 10”

| # | Aspect | Target | What “10” means (evidence) |
|---|--------|--------|----------------------------|
| 1 | **SSOT & constitution** | 10 | Amendments and North Star are **read-before-edit**; receipts atomic; no silent drift vs code. |
| 2 | **Handoff & continuity** | 10 | `QUICK_LAUNCH`, `CONTINUITY_LOG*`, `Agent Handoff` updated every shipped slice. |
| 3 | **Architecture** | 10 | `server.js` = composition root only; domains in `routes/`, `services/`, `startup/`; madge / boundaries green in CI. |
| 4 | **Data & migrations** | 10 | `lifeos-verify` (or deploy) proves migrations on disk; Neon auth known-good; `DATABASE_URL` never in repo. |
| 5 | **Verification & quality gates** | 10 | **`npm run verify:maturity`** green on every PR; optional remote `verify-project` in release checklist. |
| 6 | **AI Council (routing + gate-change)** | 10 | Load-bearing technical forks use **run-council**; rows in `gate_change_proposals` with `council_rounds_json`. |
| 7 | **Lumin / builder** | 10 | Health + jobs table + receipts; **measured** plan success rate (future metric table / dashboard). |
| 8 | **ClientCare / revenue (A18)** | 10 | Remote `verify-project` **green**; **data** in DB; browser path **receipted** under MFA policy. |
| 9 | **TC / real-estate (A17)** | 10 | Critical path tested + continuity receipts. |
| 10 | **Security & secrets** | 10 | Rotation after exposure; env map in `ENV_REGISTRY`; no secrets in git; periodic review. |
| 11 | **Autonomy & schedulers** | 10 | `createUsefulWorkGuard` on every background AI; directed mode default until re-enabled. |
| 12 | **Observability** | 10 | One place: health, build health, key metrics; alerts on **red** (future / iterative). |
| 13 | **Product / operator UX** | 10 | Task-tested flows per lane; not “shipped in theory.” |

**Market / pilot row (out of scope for pure code, but in scope for “exceptional”):** *Shipped value to a real pilot* — track separately (contract, UAT, metric).

---

## Phases (execute in order)

### Phase 0 — Baseline (no feature work)
- [ ] Run `npm run verify:maturity` locally and on CI (see workflow).
- [ ] Run `npm run lifeos:gate-change-run -- --preset program-start` ( **`POST /api/v1/lifeos/gate-change/run-preset`** on the **deploy** — multi-model run uses **server** env keys) to put the **council** decision in **DB**, not in chat.
- [ ] Fix any **red** check before claiming phase complete.

### Phase 1 — CI & verifiers (platform-only)
- [x] `verify:maturity` composite script.
- [x] GitHub Action `system-maturity.yml` (CI-safe: skips `lifeos-verify` env deps unless secrets provided).
- [x] Restore/align `npm run ssot:validate` → `scripts/ssot-validate.mjs` (wraps `ssot-check.js`).

### Phase 2 — Data & production truth
- [ ] `DATABASE_URL` + migrations applied on **production**; `lifeos-verify` **green** in an operator shell with real env.
- [ ] `verify-project` for **ClientCare** and **lifeos** against **remote** base URL.

### Phase 3 — Revenue & automation lanes
- [ ] **ClientCare:** A (remote dashboard) → B (claims volume) → C (Puppeteer hardening) per Amendment 18.
- [ ] **TC / BoldTrail** per owning amendments; same pattern: **verify** then **data** then **UI automation**.

### Phase 4 — “Better than one model”
- [ ] **Norm:** load-bearing **technical** design → `gate_change_proposals` + `run-council` before large merges.
- [ ] **Metrics:** Lumin / council token use and job outcomes (extend ledger / jobs table) — *GAP-FILL* as needed.

---

## How the council “checks the work”

1. **Before a large slice:** `POST /api/v1/lifeos/gate-change/proposals` with `hypothesis_label: THINK` and the plan in `pain_summary` (or use `--file` with this doc + diff summary).
2. **Run** `POST .../run-council` (via `npm run lifeos:gate-change-run` or HTTP).
3. **Record** the returned `council_rounds_json` in your amendment / receipt row.
4. **After code ships:** re-run `verify:maturity` and link the CI run URL in **Change Receipts**.

**Chat-based assistants do not count** as the council. **run-council** does.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-22 | Initial program: aspect table, phases, council workflow, `verify:maturity` + Action. |
