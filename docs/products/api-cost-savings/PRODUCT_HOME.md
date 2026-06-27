<!-- SYNOPSIS: Canonical product home — API Cost Savings (TokenOS / TSOS) -->

# API Cost Savings Product Home

**Canonical home:** this file  
**Product id:** `api-cost-savings`  
**Primary runtime surface:** `routes/api-cost-savings-routes.js`, live landing page at `/` (products/api-service/index.html)  
**Law anchor:** `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

B2B service that reduces clients' AI API costs by 60–90% through prompt compression, intelligent caching, model routing, and free-tier provider substitution. The platform's own cost optimization engine is packaged and sold as a standalone service to other companies with high AI bills.

**Mission statement:** Every $1 a client spends on AI, make it cost $0.10–$0.40 — and charge them a portion of what we save them.

The platform runs this system internally. TokenOS (TSOS) is the internal platform kernel. The B2B product wraps that kernel and sells it.

## Readiness state

`PARTIAL_CODE_PRESENT`

5-layer stack exists (IR Compiler, Token Optimizer, Delta Context, Cache Engine, Provider Router). Landing page is live. Routes and services are wired. No paying customer yet. No BuilderOS mission pack exists. Amendment status: `IN_BUILD → B2B product layer now built`.

## Owned runtime files

Defined in full at `docs/products/api-cost-savings/FILE_MANIFEST.json`.

Routes:
- `routes/api-cost-savings-routes.js` — main B2B product API
- `routes/tsos-efficiency-routes.js` — TSOS efficiency reporting
- `routes/tsos-platform-kernel-routes.js` — kernel control plane
- `routes/tsos-task-ledger-routes.js` — per-task token ledger
- `routes/tokenos-routes.js` — TokenOS operator API
- `routes/tco-routes.js` — TCO (total cost of ownership) dashboard
- `routes/tco-agent-routes.js` — TCO agent-specific routes

Services:
- `services/token-optimizer.js` — prompt compression + phrase substitution
- `services/tokenos-service.js` — TokenOS orchestration
- `services/tokenos-quality-check.js` — quality gate on compressed output
- `services/token-accounting-service.js` — per-request savings ledger
- `services/tsos-platform-kernel.js` — TSOS platform kernel

Landing page:
- `products/api-service/index.html` — live B2B landing page (served at `/`)
- `products/api-service/success.html`, `products/api-service/cancel.html` — Stripe flow pages

## Receipts

No formal mission receipts. No BuilderOS acceptance command defined.

## Revenue model

| Stream | Amount |
|--------|--------|
| Cost savings share | 20–40% of verified savings |
| Monthly SaaS | $297–$2,997/mo by API volume |
| Enterprise contract | Custom |
| First target client | Any business spending $2,500+/mo on AI; charge $500/mo |

## Shared dependencies

| System | Owner | Pointer |
|--------|-------|---------|
| AI Council (provider selection, routing) | Platform | `docs/projects/AMENDMENT_01_AI_COUNCIL.md` |
| Billing / Stripe | Platform | `docs/projects/AMENDMENT_03_FINANCIAL_REVENUE.md` |
| BuilderOS queue | Machine | `builderos-reboot/BP_PRIORITY.json` |

## Exact next step to become blueprint-ready

1. Write `FOUNDER_PACKET.md` in `builderos-reboot/MISSIONS/PRODUCT-API-COST-SAVINGS-V1-0001/` — what does "first paying customer using this" look like as an acceptance test.
2. Convert to `BLUEPRINT.json` — the 3–5 steps needed to sign that first customer.
3. Add to `builderos-reboot/BP_PRIORITY.json`.

The landing page is live. The tech works. The gap is customer acquisition spec, not code.

## Conversations

All API Cost Savings conversations, brainstorms, and customer acquisition session dumps live at:  
`docs/products/api-cost-savings/conversations/YYYY-MM-DD-topic.md`

## History anchor

`docs/projects/AMENDMENT_10_API_COST_SAVINGS.md` — full law, 5-layer stack spec, 50-idea savings brainstorm, session receipts.
