<!-- SYNOPSIS: IdeaVault — Agent Cold-Start Entry -->

# IdeaVault — Agent Cold-Start Entry

**You are working on IdeaVault (internal idea queue and backlog engine).**

## Read first

1. `docs/products/ideavault/PRODUCT_HOME.md` — mission, ownership, scope decision required
2. `docs/products/ideavault/FILE_MANIFEST.json` — every file this product owns
3. `docs/projects/AMENDMENT_38_IDEA_VAULT.md` — law, idea catalog, routing rules
4. `docs/products/AUTHORITY_BOUNDARIES.md` — what you can change vs. what is shared

## What this product does

IdeaVault is an internal administrative tool — not a user-facing SaaS product. It captures ideas from operator brainstorms and multi-model build conversations, routes them to the correct owning amendment or product home, and provides a structured intake surface for the BuilderOS and Chair layers.

The amendment (AMENDMENT_38) is the primary artifact. The API surface (`idea-queue-routes.js`, `idea-engine.js`) is secondary.

## Scope decision still open

Before writing any new code or creating a mission pack, read `docs/products/ideavault/PRODUCT_HOME.md` — the "Decision required" section. A product vs. LifeOS-feature decision must be made before blueprinting.

## Owned code boundaries

You may modify:
- `routes/idea-queue-routes.js`
- `services/idea-engine.js`
- `services/idea-engine/index.js`

Do not modify the amendment itself without reading the full AMENDMENT_38 file first (SSOT READ-BEFORE-WRITE rule).

## Current state (as of 2026-06-27)

- Route and engine services exist for internal API use.
- Amendment is live and active as a documentation/backlog SSOT.
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission ID in BP_PRIORITY.json.
- Scope decision (standalone vs. LifeOS feature) is open.

## Amendment coupling

Every `.js` file you touch in `routes/idea-queue*.js` or `services/idea-engine*.js` must have `@ssot AMENDMENT_38_IDEA_VAULT.md` and the amendment must be updated in the same commit.

Pre-commit hook will block if you violate this.
