# AMENDMENT 03 — Financial & Revenue System
**Status:** LIVE (partial)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

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
