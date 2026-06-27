<!-- SYNOPSIS: Canonical product home — BoldTrail CRM Integration -->

# BoldTrail Product Home

**Canonical home:** this file  
**Product id:** `boldtrail`  
**Primary runtime surface:** `routes/boldtrail-routes.js`, `routes/boldtrail-coaching-routes.js`  
**Law anchor:** `docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

Shared CRM adapter for kvCORE/BoldTrail. This is a **platform module**, not a standalone product. It provides the integration layer that any product in the stack can consume when it needs to read or write the BoldTrail CRM.

**Current consumers:**
- LifeRE — reads the operator's own BoldTrail pipeline (lead status, showings, performance)
- TC Service — reads and writes BoldTrail for agent clients

**Future consumers:** Any product that needs CRM data can depend on this module. The dependency should be declared in that product's `FILE_MANIFEST.json` → `shared_dependencies`.

**Replacement note:** BoldTrail will eventually be replaced. When that happens, only this module changes — consuming products are isolated from the swap.

**Status per amendment (as of 2026-06-22):** `LIVE (in use)`

## Readiness state

`SHARED_PLATFORM_MODULE`

No standalone mission pack needed. BoldTrail is maintained as an integration layer. It does not enter the BuilderOS product queue on its own. Changes to it follow the normal code-change flow with AMENDMENT_11 as the law anchor.

No FOUNDER_PACKET needed. No BLUEPRINT.json needed. No mission ID in BP_PRIORITY.

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

## How to extend BoldTrail to a new consumer product

If a new product needs CRM access:
1. Add `services/lifere-boldtrail-bridge.js` or `src/integrations/boldtrail.js` as a `shared_dependency` in that product's `FILE_MANIFEST.json`
2. Do not duplicate BoldTrail logic in the consuming product
3. If the integration needs new behavior, add it here and update AMENDMENT_11

## Conversations

All BoldTrail integration conversations, session dumps, and replacement planning notes live at:  
`docs/products/boldtrail/conversations/YYYY-MM-DD-topic.md`

## History anchor

`docs/projects/AMENDMENT_11_BOLDTRAIL_REALESTATE.md` — full law, DB schema, API spec, session receipts.
