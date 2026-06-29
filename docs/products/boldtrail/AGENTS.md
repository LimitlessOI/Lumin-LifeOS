<!-- SYNOPSIS: BoldTrail — Agent Cold-Start Entry -->

# BoldTrail — Agent Cold-Start Entry

**You are working on the BoldTrail CRM integration layer.**

## Read first

1. `docs/products/boldtrail/PRODUCT_HOME.md` — mission, ownership, scope decision required
2. `docs/products/boldtrail/FILE_MANIFEST.json` — every file this product owns
3. `docs/products/boldtrail/PRODUCT_HOME.md` — law, DB schema, API spec, receipts
4. `docs/products/AUTHORITY_BOUNDARIES.md` — what you can change vs. what is shared

## What this product does

Deep integration with BoldTrail (kvCORE-based CRM). Automates lead follow-up, showing reminders, post-showing emails, agent onboarding, performance coaching, and agent recruitment.

**Consumers:** LifeRE uses BoldTrail for the operator's own real-estate business. TC Service uses BoldTrail for agent clients. BoldTrail is the CRM adapter layer.

## Status: LIVE (in use)

The integration is live in production. Changes require care — regression here breaks both LifeRE and TC Service.

## Scope decision still open

Before creating a mission pack, read `docs/products/boldtrail/PRODUCT_HOME.md` — the "Decision required" section. Is this a shared platform module or a standalone agent-subscription product? That decision controls whether a FOUNDER_PACKET is warranted.

## Owned code boundaries

You may modify:
- `routes/boldtrail-routes.js`, `routes/boldtrail-coaching-routes.js`
- `routes/outreach-crm-routes.js`, `routes/agent-recruitment-routes.js`
- `services/lifere-boldtrail-bridge.js`
- `src/integrations/boldtrail.js`

You must NOT modify without confirming with TC Service and LifeRE product owners:
- Any endpoint used by `services/tc-coordinator.js` or `services/lifere-os-v1.js`

## Current state (as of 2026-06-27)

- Integration is live and in use.
- No formal mission pack. No BuilderOS acceptance command.
- Scope decision (module vs. standalone product) is open.

## Amendment coupling

Every `.js` file you touch in `routes/boldtrail*.js`, `routes/outreach-crm*.js`, `routes/agent-recruitment*.js`, `services/lifere-boldtrail-bridge.js`, or `src/integrations/boldtrail.js` must have `@ssot AMENDMENT_11_BOLDTRAIL_REALESTATE.md` and the amendment must be updated in the same commit.

Pre-commit hook will block if you violate this.
