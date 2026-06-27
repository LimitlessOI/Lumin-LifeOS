<!-- SYNOPSIS: Canonical product home — BoldTrail CRM Integration -->

# BoldTrail Product Home

**Canonical home:** this file  
**Product id:** `boldtrail`  
**Primary runtime surface:** `routes/boldtrail-routes.js`, `routes/boldtrail-coaching-routes.js`  
**Law anchor:** `docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

Deep integration with BoldTrail (kvCORE-based real estate CRM). Automates lead follow-up, property showing reminders, post-showing emails, agent onboarding, performance coaching, and agent recruitment on behalf of real estate agents.

**Relationship to LifeRE and TC Service:** BoldTrail is the CRM system of record. LifeRE reads the BoldTrail pipeline for the operator's own business. TC Service reads and writes BoldTrail for agent clients. BoldTrail itself is the CRM adapter — not a standalone product in the user-facing sense.

**Status per amendment (as of 2026-06-22):** `LIVE (in use)`

## Readiness state

`PARTIAL_CODE_PRESENT`

Core integration code exists and is live. Routes are wired. No mission pack (FOUNDER_PACKET / BLUEPRINT.json) exists for standalone autonomous build cycles. The primary question before blueprinting: is BoldTrail a standalone product or a shared platform module used by LifeRE and TC?

## Owned runtime files

Defined in full at `docs/products/boldtrail/FILE_MANIFEST.json`.

Routes:
- `routes/boldtrail-routes.js`
- `routes/boldtrail-coaching-routes.js`
- `routes/outreach-crm-routes.js`
- `routes/agent-recruitment-routes.js`

Services:
- `services/lifere-boldtrail-bridge.js` — LifeRE reads BoldTrail pipeline; approval-gated note write-back
- `src/integrations/boldtrail.js` — kvCORE v2 contacts, notes, tags, filtered list, normalize

DB tables (from law anchor):
- `boldtrail_email_drafts` — AI-generated emails pending review/send
- `boldtrail_agents` — agent profiles and settings
- `boldtrail_leads` — synced leads with status
- `boldtrail_showings` — scheduled property showings

## Receipts

No formal mission receipts. No BuilderOS acceptance command defined.

## Required env vars

- `BOLDTRAIL_API_KEY` — BoldTrail API access
- `BOLDTRAIL_WEBHOOK_SECRET` — webhook verification

## Shared dependencies

| System | Owner | Pointer |
|--------|-------|---------|
| AI Council (email drafting, coaching) | Platform | `docs/projects/AMENDMENT_01_AI_COUNCIL.md` |
| LifeRE (business shell consumer) | LifeRE | `docs/products/lifere/PRODUCT_HOME.md` |
| TC Service (agent client consumer) | TC Service | `docs/products/tc-service/PRODUCT_HOME.md` |
| Autonomy scheduler (background jobs) | Platform | `startup/boot-domains.js` |
| BuilderOS queue | Machine | `builderos-reboot/BP_PRIORITY.json` |

## Decision required before blueprint-ready

Before writing a FOUNDER_PACKET, one scope decision is required:

**Option A:** BoldTrail is a shared platform module. No standalone mission. LifeRE and TC Service both depend on it. It is maintained as an integration layer, not built via its own mission queue.  
**Option B:** BoldTrail has a distinct user-facing product offering (agent CRM subscription) that is separate from LifeRE's own use. In that case, write a standalone FOUNDER_PACKET for the agent-subscription lane.

The amendment's revenue model ($97–$197/mo per agent subscription) suggests Option B is viable. Option A is the current reality in code.

## History anchor

`docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md` — full law, DB schema, API spec, session receipts.
