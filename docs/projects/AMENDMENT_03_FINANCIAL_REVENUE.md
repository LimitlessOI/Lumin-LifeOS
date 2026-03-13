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
