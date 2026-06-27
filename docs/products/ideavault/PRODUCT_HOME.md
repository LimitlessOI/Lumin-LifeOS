<!-- SYNOPSIS: IdeaVault — platform tool for idea and conversation intake/routing -->

# IdeaVault Platform Tool

**Canonical home:** this file  
**Type:** `PLATFORM_TOOL` — not a product, not in the BuilderOS mission queue  
**Product id:** `ideavault`  
**Law anchor:** `docs/projects/AMENDMENT_38_IDEA_VAULT.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## What it does

IdeaVault is an intake and routing tool. Its job is to make sure no idea or conversation gets lost — and that whatever is captured ends up in the right place.

**Intake sources:**
- Conversations with Chair/Lumin that surface product ideas mid-session
- Operator brainstorms pasted directly
- BuilderOS gap analysis output
- Any agent that identifies a feature worth preserving

**Routing output:**
- Ideas related to a specific product → `docs/products/<product-id>/conversations/`
- Cross-product or platform ideas → `docs/projects/AMENDMENT_38_IDEA_VAULT.md` catalog
- Ideas with no clear owner → `docs/conversation_dumps/OPERATOR_BRAINSTORM_INBOX.md` (pending triage)

## The conversations convention

Every product folder follows this pattern:

```
docs/products/<product-id>/
  PRODUCT_HOME.md
  FILE_MANIFEST.json
  AGENTS.md
  conversations/          ← all conversations, brainstorms, session dumps for this product live here
    YYYY-MM-DD-topic.md
```

IdeaVault is the tool that routes conversations into those folders. The folders are the destination. IdeaVault is the mechanism.

## Runtime files

- `routes/idea-queue-routes.js` — intake API for programmatic idea submission
- `services/idea-engine.js`, `services/idea-engine/index.js` — classification and routing engine

These are platform-layer utilities. They are not owned by any single product. Any product or system agent can call them.

## What does NOT live here

IdeaVault does not own the ideas themselves. Ideas live in:
- Their product's `conversations/` folder (if product-specific)
- `docs/projects/AMENDMENT_38_IDEA_VAULT.md` (cross-product catalog and law)
- `IMMEDIATE_FEATURES_AND_REVOLUTIONARY_IDEAS.md` (repo-root dated brainstorm log)

## Conversations

IdeaVault-specific conversations (about the tool itself, not ideas it contains) live at:  
`docs/products/ideavault/conversations/YYYY-MM-DD-topic.md`

## History anchor

`docs/projects/AMENDMENT_38_IDEA_VAULT.md` — full idea registry, catalog, cross-product index, review protocol.
