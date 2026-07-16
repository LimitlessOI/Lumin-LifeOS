<!-- SYNOPSIS: Canonical product home — Financial Revenue -->

# Financial Revenue Product Home

**Formerly called:** Amendment 03 — FINANCIAL REVENUE

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `financial-revenue` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/financial-revenue/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-16 — Added missing `@ssot docs/products/financial-revenue/PRODUCT_HOME.md` header to BuilderOS-generated `routes/pricingValidation.js`. Prior: 2026-07-03 — **BOOT HOTFIX (`startup/database.js`):** a non-idempotent migration failure no longer throws/aborts founder-runtime boot. Previously a single bad migration (the loop-authored `20260420_lifeos_phase2_schema.sql`, whose `habit_logs.habit_id uuid REFERENCES habits(id)` conflicted with a legacy integer `habits.id`) re-threw out of `initDatabase` and aborted boot before route registration — every route 404'd, only `/health` stayed up. Now such a failure is logged loudly, left unapplied to retry next boot, and boot continues to register routes. One bad migration can degrade a feature, never take down the whole server. Prior: 2026-07-05 |

---
**Status:** LIVE (partial)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-07-05 — startup migration runner safety narrowed so missing-object failures retry instead of being marked applied.

---

## WHAT THIS IS
Tracks every dollar in and every dollar spent. Revenue events (Stripe payments, manual entries) flow into a financial ledger. AI spend is tracked against the daily budget. ROI is calculated per task. Income drones monitor revenue streams. The financial dashboard surfaces all of this in real time.

**Mission:** Know at all times: what did we earn today, what did we spend, and is ROI positive?

---

## REVENUE ALIGNMENT
This IS revenue infrastructure. Without it:
- Can't enforce `MAX_DAILY_SPEND`
- Can't prove ROI to users/clients
- Can't gate AI spend behind revenue threshold
- Can't calculate commission payouts

---

## TECHNICAL SPEC

### Files (Current)
| File | Purpose |
|------|---------|
| `routes/stripe-routes.js` | Stripe webhook handling |
| `core/stripe-automation.js` | Stripe automation (subscription management) |
| `core/api-cost-savings-revenue.js` | API cost savings revenue calculations |
| `server.js` (lines 4157–4252, 5138–5370) | ROI tracker, income drones, ledger, financial dashboard — NEEDS EXTRACTION |

### DB Tables
| Table | Purpose |
|-------|---------|
| `financial_ledger` | All revenue + expense transactions |
| `daily_spend` | Per-day AI cost tracking |
| `roi_tracker` | Rolling ROI metrics |
| `stripe_webhook_events` | Stripe event log (idempotency) |
| `billing_projects` | Project → Stripe customer mapping |
| `project_subscriptions` | Active subscriptions |
| `project_entitlements` | What each project has access to |

### Key Endpoints
- `GET /api/v1/financial/dashboard` — revenue, spend, ROI
- `POST /api/v1/revenue/event` — log a revenue event
- `GET /api/v1/spending/analysis` — AI cost breakdown
- `GET /api/v1/income/drones` — income drone status

### Stripe Env Vars Required
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## CURRENT STATE
- **KNOW:** `financial_ledger` table exists with `tx_id` unique constraint
- **KNOW:** `daily_spend` table tracks date + USD amount
- **KNOW:** Income drones are DISABLED (`const DISABLE_INCOME_DRONES = true` in server.js)
- **KNOW:** Stripe webhook handler exists at `routes/stripe-routes.js`
- **THINK:** ROI tracker is in-memory only — resets on server restart
- **DON'T KNOW:** Whether Stripe webhooks are configured on Railway

---

## REFACTOR PLAN
1. Move ROI tracker state to DB (currently in-memory `roiTracker` object in server.js)
2. Move income drone logic out of server.js → `services/income-drones.js`
3. Move financial dashboard endpoint → `routes/financial-routes.js`
4. Add: revenue goal tracking (target: $500/day from North Star)
5. Add: daily revenue email/SMS report via Twilio at end of day
6. Re-enable income drones once at least one revenue stream is active

---

## NON-NEGOTIABLES (this project)
- NEVER process a real charge without Stripe webhook signature verification
- ROI must be positive before enabling autonomous AI spending (North Star Article 5.3)
- Financial ledger is append-only — no deletes, only reversal entries
- All Stripe webhook events must be idempotent (check `event_id` before processing)
- Human approval required for any transaction > $100 (North Star Article 3.1)

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 68/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] DB schema documented — `financial_ledger`, `daily_spend`, `roi_tracker`, `stripe_webhook_events` all defined
- [x] API surface defined — four endpoints documented
- [ ] ROI tracker persistence not yet specified — currently in-memory, no migration written for DB-backed version
- [ ] Income drone scheduler not extracted — `DISABLE_INCOME_DRONES = true` in server.js with no documented re-enable path
- [ ] Revenue goal tracking ($500/day target) has no schema or endpoint defined yet
- [ ] Daily revenue report (SMS/email) not yet documented to implementation level

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| QuickBooks + Stripe | Trusted, accountant-approved, broad integrations | Zero AI cost awareness — no concept of "ROI per task" or "AI spend vs revenue" | We track ROI per AI task, not just revenue/expense; we gate AI spend based on revenue position |
| Pilot.com | CFO-grade reporting, human bookkeepers | No real-time AI cost tracking, no autonomous spend gating, expensive (~$599/mo) | We are fully automated and real-time; we ship the ledger as an operational control layer, not a reporting tool |
| Stripe Revenue Recognition | Accurate GAAP revenue reporting | Only Stripe data — blind to AI costs, ROI, or multi-source revenue | Our ledger is multi-source (Stripe + manual + affiliate + cost savings) in one view |
| Baremetrics | Beautiful SaaS metrics dashboards | Stripe-only, no expense side, no AI cost model | We integrate revenue + AI cost + per-task ROI — the full picture for an AI-powered business |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Stripe changes webhook payload format | Medium | Medium — idempotency checks break | Mitigate: version-check webhook events; test against Stripe CLI |
| Income drones run autonomously and generate revenue that triggers tax events without proper categorization | Medium | High — tax liability, compliance gap | Mitigate: all ledger entries require `category` tag before enabling drones; quarterly review gate |
| ROI tracker in-memory resets cause AI overspend during server restarts | HIGH (confirmed bug) | High — could burn budget silently | Mitigate: persisting ROI tracker to DB is Gate 1 requirement before re-enabling any spend gating |
| AI cost per call drops 90% industry-wide (commoditization) | Medium | Low — reduces the importance of cost gating, but our savings product still captures margin | Accept: pivot savings product to quality routing rather than cost savings alone |

### Gate 4 — Adaptability Strategy
The financial ledger is schema-defined and append-only, which means adding new revenue streams is a new entry type, not a code change. Adding new AI providers to cost tracking requires only a new row in `daily_spend` — no schema change. If a competitor offers multi-currency ROI tracking, we can add a `currency` column and FX rate lookup service without touching the ledger logic. Score: 68/100 — the append-only ledger design is excellent for adaptability, but the ROI tracker being in-memory today is a structural gap that reduces the score until migrated.

### Gate 5 — How We Beat Them
Every other financial tool tracks what you earned and spent after the fact; LifeOS tracks ROI per AI task in real time and uses that data to gate further AI spending — so the system pays for itself or it stops spending, automatically.

---

## Change Receipts

| 2026-05-24 | Batch push: factory runtime separation, AUTONOMOUS-RECOVERY-0001, regression harness, lumin-factory bundle — founder-requested Railway test deploy | routes/services/startup + factory-staging + builderos-reboot | Adam audit+push directive |

| Date | What Changed | Why | Verified |
|---|---|---|---|
| 2026-07-05 | **Migration runner safety repair.** `startup/database.js` now treats only narrow already-present/duplicate errors as safe to mark applied. Missing relation/column failures (`does not exist`) and failed drops retry on next boot instead of being permanently inserted into `schema_migrations`. Added `tests/migration-safety.test.js`. | The earlier 2026-07-05 resilience regex reintroduced the Phase 13 failure mode: a dependency/schema-mismatch migration could be silently marked applied, leaving the DB permanently drifted. | `node --test tests/migration-safety.test.js`; `node --check startup/database.js` |
| 2026-05-26 | **Phase 13 (BuilderOS) — Migration failure detection fix:** `startup/database.js` (+3 lines, ~4 line change in catch block). Removed `await markApplied(pool, filename).catch(() => {})` from the catch block in `initDatabase()`. Failed migrations now log at `error` level with "will retry on next boot" message and do NOT get inserted into `schema_migrations`. This means failed migrations retry on every boot until they succeed. Root cause of this fix: the `self_repair_memory_events` table was never created because all 3 migration attempts failed (FK reference to `epistemic_facts` table which didn't exist, then BEGIN/COMMIT wrapping issues) but were silently marked as applied — so the failure was permanently hidden. Migrations must be idempotent (`IF NOT EXISTS`) for retry to be safe; most existing migrations already are. `node --check` PASS. Zone 4 file (startup/ path) — GAP-FILL: direct surgical fix, not builder. | Failed migrations silently skipped on every subsequent boot. Phase 13 directive: "stop failed migrations from being marked applied." | `node --check` PASS |
