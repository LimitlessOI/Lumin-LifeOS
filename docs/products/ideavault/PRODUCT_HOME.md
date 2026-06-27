<!-- SYNOPSIS: Canonical product home — IdeaVault (Idea Queue + Backlog Engine) -->

# IdeaVault Product Home

**Canonical home:** this file  
**Product id:** `ideavault`  
**Primary runtime surface:** `routes/idea-queue-routes.js` (internal admin API)  
**Law anchor:** `docs/projects/AMENDMENT_38_IDEA_VAULT.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

IdeaVault is an internal product: a registry and queue engine for ideas captured from multi-model build conversations and operator brainstorms. It prevents idea loss, routes themes to the correct owning amendment or product, and gives the BuilderOS and Chair layers a structured intake surface for new build ideas.

**This is an internal admin tool, not a user-facing SaaS product.**  
It does not have a consumer UI. It serves Adam and the build pipeline.

## Readiness state

`PARTIAL_CODE_PRESENT`

The law anchor (AMENDMENT_38) is extensive. A runtime queue route and engine service exist. However, no mission pack (FOUNDER_PACKET / BLUEPRINT.json) exists to formally specify what "IdeaVault working" means in production. The amendment itself says the product is `LIVE (documentation / backlog SSOT — not a shipping product surface)`.

The code exists for an API surface. The open question is whether IdeaVault warrants a standalone mission or should be absorbed into LifeOS as an admin feature of the Chair layer.

## Owned runtime files

Defined in full at `docs/products/ideavault/FILE_MANIFEST.json`.

Routes:
- `routes/idea-queue-routes.js`

Services:
- `services/idea-engine.js`
- `services/idea-engine/index.js`

Docs:
- `docs/projects/AMENDMENT_38_IDEA_VAULT.md` — canonical idea catalog (law anchor)
- `docs/conversation_dumps/OPERATOR_BRAINSTORM_INBOX.md` — verbatim brainstorm pastes
- `IMMEDIATE_FEATURES_AND_REVOLUTIONARY_IDEAS.md` — repo-root dated feature/idea list

## Receipts

No formal mission receipts. No BuilderOS acceptance command defined.

## Shared dependencies

| System | Owner | Pointer |
|--------|-------|---------|
| AI Council (idea classification) | Platform | `docs/projects/AMENDMENT_01_AI_COUNCIL.md` |
| Memory (idea provenance tracking) | Platform | `docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md` |
| BuilderOS queue | Machine | `builderos-reboot/BP_PRIORITY.json` |

## Decision required before blueprint-ready

IdeaVault has partial code but ambiguous product scope. Before a FOUNDER_PACKET can be written, one decision is required:

**Option A:** Standalone product — IdeaVault gets its own mission, acceptance criteria, and formal queue position.  
**Option B:** LifeOS feature — merge `idea-queue-routes.js` and `idea-engine.js` into LifeOS product home and remove IdeaVault as a separate product.

The amendment is large and should be preserved as law either way. Only the runtime product scope needs clarification.

## History anchor

`docs/projects/AMENDMENT_38_IDEA_VAULT.md` — full idea registry, catalog, cross-links to owning amendments, review protocol.
