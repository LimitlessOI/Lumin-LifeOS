<!-- SYNOPSIS: Canonical product home — ClientCare Billing Recovery -->

# ClientCare Billing Recovery Product Home

**Canonical home:** this file  
**Product id:** `clientcare-billing-recovery`  
**Primary runtime surface:** `routes/clientcare-billing-routes.js` (operator API, no public UI yet)  
**Law anchor:** `docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

Billing-recovery and revenue-cycle operating system built around the ClientCare EHR/billing platform used by Sherry's practice. Designed to rescue unpaid insurance claims already earned, prevent additional claims from aging out, and give Sherry a controlled work queue with clear next actions.

Two linked lanes:
- **Insurance Recovery OS** — eligibility, claims, denials, underpayments, ERA/remits, appeals, collections forecast
- **Patient AR OS** — payment-plan monitoring, past-due balance work queue, provider-directed escalation, controlled outreach

This product has no public API from the vendor. It uses browser automation (Puppeteer) as the execution path against the ClientCare web app.

## Readiness state

`PARTIAL_CODE_PRESENT`

Core services and routes exist. Browser automation path is defined. No mission pack (FOUNDER_PACKET / BLUEPRINT.json) exists. Cannot enter BuilderOS queue without one.

## Owned runtime files

Defined in full at `docs/products/clientcare-billing-recovery/FILE_MANIFEST.json`.

Routes:
- `routes/clientcare-billing-routes.js`

Services:
- `services/clientcare-billing-service.js` — core billing recovery logic
- `services/clientcare-browser-service.js` — Puppeteer browser automation against ClientCare
- `services/clientcare-ops-service.js` — operational queue management
- `services/clientcare-sellable-service.js` — sellable service layer
- `services/clientcare-sync-service.js` — sync and export flow

## Receipts

No formal mission receipts. No BuilderOS acceptance command defined.

## Non-negotiables (from law anchor)

- Never store ClientCare credentials in code, docs, or git. Use Railway secrets only.
- No patient billing path may be assumed lawful without payer-specific confirmation.
- Timely-filing, appeals, and rebill advice must stay evidence-backed.
- Automation allowed for: data gathering, queueing, exports, draft actions only.
- Sensitive billing submissions require human approval gate until live validation is complete.

## Shared dependencies

| System | Owner | Pointer |
|--------|-------|---------|
| AI Council (claim drafting, denial analysis) | Platform | `docs/projects/AMENDMENT_01_AI_COUNCIL.md` |
| Memory (client/payer history) | Platform | `docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md` |
| Billing / Stripe (if monetized externally) | Platform | `docs/projects/AMENDMENT_03_FINANCIAL_REVENUE.md` |
| BuilderOS queue | Machine | `builderos-reboot/BP_PRIORITY.json` |

## Exact next step to become blueprint-ready

1. Confirm which execution path is primary: vendor API (preferred if available) or browser automation.
2. Write `FOUNDER_PACKET.md` in `builderos-reboot/MISSIONS/PRODUCT-CLIENTCARE-V1-0001/` — what does "the billing rescue is working" look like for Sherry.
3. Convert to `BLUEPRINT.json` with acceptance criteria tied to real claim recovery, not mock data.
4. Add to `builderos-reboot/BP_PRIORITY.json`.

The most important first action is the FOUNDER_PACKET. The code scaffolding exists; it needs a spec target.

## History anchor

`docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md` — full law, operating model, vendor facts, session receipts.
