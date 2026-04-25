# Domain: TokenOS (B2B API Cost Savings)

> **READ FIRST:** [`00-LIFEOS-AGENT-CONTRACT.md`](00-LIFEOS-AGENT-CONTRACT.md)

**Last updated:** 2026-04-22  
**SSOT:** `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md`  
**Owning service:** `services/tokenos-service.js` + `services/tokenos-quality-check.js`  
**Owning routes:** `routes/tokenos-routes.js`  
**Mounted at:** `/api/v1/tokenos` + `/token-os` (static pages)

---

## What This Domain Does

B2B product: customers bring their own AI provider API keys. TokenOS proxies calls through a 5-layer compression stack, verifies quality with TCO-C01/C02 gate, and charges 20% of verified token savings.

Revenue model: customers pay nothing until savings are verified. Invoice monthly.

---

## Tables

- **`tco_customers`** — B2B customer registry: `id`, `name`, `email`, `company`, `api_key` (tok_live_ format), `encrypted_keys` (JSONB, AES-256-GCM), `status` (active/suspended/cancelled), `plan`, `created_at`
- **`tco_requests`** — per-proxy-call ledger: `id`, `customer_id` (FK), `provider`, `model`, `original_tokens`, `compressed_tokens`, `savings_tokens`, `savings_pct`, `our_revenue_usd`, `quality_score`, `quality_verdict`, `mode` (optimized/direct/ab_test), `created_at`
- **`tco_agent_interactions`** — social sales agent activity
- **`tco_agent_negotiations`** — negotiation threads
- **`tco_savings_daily`** — VIEW aggregating daily savings per customer

Migration: `db/migrations/20260422_tokenos_customers.sql`

---

## Key Service Functions (services/tokenos-service.js)

- `registerCustomer({name, email, company, plan})` → `{apiKey, instructions}`
- `getCustomerByKey(apiKey)` — fast lookup, called on every proxy request
- `storeProviderKeys(customerId, providerKeys)` — AES-256-GCM encrypt
- `getSavingsSummary(customerId, {days})` — includes `our_revenue_usd = savings * 0.20`
- `getMonthlyInvoice(customerId, year, month)`
- `onboardCustomer({name, email, company, plan, providerKeys})` — register + store keys in one call

## Quality Gate (services/tokenos-quality-check.js)

- `runQualityGate({prompt, compressedResponse, directResponse, markers})` → `{verdict: pass|warn|fail, score, details}`
- `QUALITY_THRESHOLD = 72` — score below this = fail
- `REGRESSION_THRESHOLD_PCT = 15` — > 15% degradation vs direct = fail
- If verdict = fail → proxy automatically falls back to direct (uncompressed) call

---

## API Surface

```http
POST /api/v1/tokenos/register          — public; returns api_key (shown once)
POST /api/v1/tokenos/proxy             — Bearer tok_live_...; modes: optimized/direct/ab_test
GET  /api/v1/tokenos/dashboard         — Bearer; savings summary
GET  /api/v1/tokenos/report            — Bearer; detailed + daily breakdown
GET  /api/v1/tokenos/invoice/:y/:m     — Bearer; monthly invoice
POST /api/v1/tokenos/rotate-key        — Bearer
POST /api/v1/tokenos/store-keys        — Bearer; store encrypted provider keys
GET  /api/v1/tokenos/admin/customers   — COMMAND_CENTER_KEY
GET  /api/v1/tokenos/admin/stats       — COMMAND_CENTER_KEY
POST /api/v1/tokenos/admin/quality-test — COMMAND_CENTER_KEY
GET  /token-os                         — tokenos-landing.html (marketing + signup)
GET  /token-os/dashboard               — tokenos-dashboard.html (client portal)
```

---

## What NOT to Touch

- Do NOT modify `routes/tco-routes.js` — that is the old dead path with wrong column names. It will be retired.
- Do NOT create a `tco_customers` migration — it already exists in `20260422_tokenos_customers.sql`.
- `core/tco-encryption.js` owns AES-256-GCM logic — do not reimplement encryption inline.

---

## Next Approved Task

1. **Stripe billing** — wire `getMonthlyInvoice` output → Stripe charge on invoice approval. See `AMENDMENT_03_FINANCIAL_REVENUE.md`.
2. **Public ticker** — `GET /api/v1/tokenos/admin/stats` feeds the animated savings ticker on the landing page. Add a read-only public endpoint (no auth) that returns aggregate platform savings only (no customer data).
3. **Retire `routes/tco-routes.js`** — column names mismatch new schema. Mark dead, do not resurrect.
