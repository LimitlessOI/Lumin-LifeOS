<!-- SYNOPSIS: ClientCare Billing Recovery — Agent Cold-Start Entry -->

# ClientCare Billing Recovery — Agent Cold-Start Entry

**You are working on ClientCare Billing Recovery (billing rescue for Sherry's practice).**

## Read first

1. `docs/products/clientcare-billing-recovery/PRODUCT_HOME.md` — mission, ownership, readiness state
2. `docs/products/clientcare-billing-recovery/FILE_MANIFEST.json` — every file this product owns
3. `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` — law, vendor model, operating constraints
4. `docs/products/AUTHORITY_BOUNDARIES.md` — what you can change vs. what is shared

## What this product does

Billing recovery and revenue-cycle OS for the ClientCare EHR/billing platform (browser-automation based — no vendor API). Two lanes:
1. **Insurance Recovery OS** — eligibility, claims, denials, underpayments, ERA/remits, appeals, collections forecast
2. **Patient AR OS** — payment-plan monitoring, past-due work queue, controlled outreach

## Critical constraints

- **Never store ClientCare credentials in code, docs, or git.** Use Railway secrets only.
- Browser automation may NOT auto-submit billing claims. Submissions require human approval gate.
- Any payer-specific timely-filing, appeal, or rebill path must be confirmed evidence-backed before being coded as automatic.
- The vendor (ClientCare) provides no public API. Puppeteer is the execution path.

## Owned code boundaries

You may modify:
- `routes/clientcare-billing-routes.js`
- `services/clientcare-billing-service.js`
- `services/clientcare-browser-service.js`
- `services/clientcare-ops-service.js`
- `services/clientcare-sellable-service.js`
- `services/clientcare-sync-service.js`

## Current state (as of 2026-06-27)

- Core services and routes exist. Browser automation path is defined.
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission ID in BP_PRIORITY.json.
- No formal acceptance criteria defined.

## Next priority for a cold agent

Write `builderos-reboot/MISSIONS/PRODUCT-CLIENTCARE-V1-0001/FOUNDER_PACKET.md`. Key question to answer in the packet: what does "billing rescue is working" look like in Sherry's practice — a specific number of claims recovered, or a specific workflow she can run?

Then convert to BLUEPRINT.json and add to BP_PRIORITY.json.

## Amendment coupling

Every `.js` file you touch in `routes/clientcare*.js` or `services/clientcare*.js` must have `@ssot AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` and the amendment must be updated in the same commit.

Pre-commit hook will block if you violate this.
