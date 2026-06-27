<!-- SYNOPSIS: API Cost Savings — Agent Cold-Start Entry -->

# API Cost Savings — Agent Cold-Start Entry

**You are working on API Cost Savings (TokenOS / TSOS — B2B AI cost reduction service).**

## Read first

1. `docs/products/api-cost-savings/PRODUCT_HOME.md` — mission, ownership, readiness state, revenue model
2. `docs/products/api-cost-savings/FILE_MANIFEST.json` — every file this product owns
3. `docs/projects/AMENDMENT_10_API_COST_SAVINGS.md` — law, 5-layer stack spec, session receipts
4. `docs/products/AUTHORITY_BOUNDARIES.md` — what you can change vs. what is shared

## What this product does

B2B SaaS that reduces clients' AI API spend by 60–90% through:
1. **IR Compiler** — prompt compression
2. **Token Optimizer** — phrase substitution, waste removal
3. **Delta Context** — skip unchanged context on follow-up calls
4. **Cache Engine** — deduplicate identical or near-identical prompts
5. **Provider Router** — route low-complexity calls to cheaper/free-tier models

The platform runs this internally (TSOS kernel). The B2B product wraps the kernel and sells it to other companies with high AI bills.

**Landing page is live at `/`** (`products/api-service/index.html`).

## Owned code boundaries

You may modify:
- `routes/api-cost-savings-routes.js`
- `routes/tsos-efficiency-routes.js`, `routes/tsos-platform-kernel-routes.js`, `routes/tsos-task-ledger-routes.js`
- `routes/tokenos-routes.js`, `routes/tco-routes.js`, `routes/tco-agent-routes.js`
- `services/token-optimizer.js`, `services/tokenos-service.js`
- `services/tokenos-quality-check.js`, `services/token-accounting-service.js`
- `services/tsos-platform-kernel.js`
- `products/api-service/*.html`

You must NOT modify without reading shared ownership rules:
- `services/ai-council*.js` — owned by AMENDMENT_01 (the council is a consumer of this kernel, not owned by it)
- `services/billing*.js` — owned by AMENDMENT_03

## Current state (as of 2026-06-27)

- 5-layer stack built. Landing page live. Routes and services wired.
- No paying B2B customer yet.
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission ID in BP_PRIORITY.json.

## Next priority for a cold agent

Write `builderos-reboot/MISSIONS/PRODUCT-API-COST-SAVINGS-V1-0001/FOUNDER_PACKET.md`. The mission goal is signing the first B2B paying customer. The tech exists; the gap is customer acquisition and the acceptance test for "this is working."

## Amendment coupling

Every `.js` file you touch in `routes/api-cost-savings*.js`, `routes/tsos*.js`, `routes/tokenos*.js`, `routes/tco*.js`, or `services/token*.js` or `services/tsos*.js` or `services/tokenos*.js` must have `@ssot AMENDMENT_10_API_COST_SAVINGS.md` and the amendment must be updated in the same commit.

Pre-commit hook will block if you violate this.
