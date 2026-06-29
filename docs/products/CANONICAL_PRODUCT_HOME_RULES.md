<!-- SYNOPSIS: Canonical product-home law -->

# Canonical Product Home Rules

## Rule

Each product gets **one canonical home**.

That home is the first place an agent reads for:
- what the product is
- what files it owns
- what missions are active
- what other systems it depends on
- what is shared vs not shared

## No duplication by default

Do **not** duplicate shared doctrine or shared implementation details across products.

Use this model:
- **Owned here:** files and behavior the product directly owns
- **Depends on:** shared systems the product uses but does not own
- **History anchors:** old law, amendments, receipts, transcripts, or retired paths

## Why

Duplicating shared information across products creates drift.

If one shared system changes:
- one copy gets updated
- another copy gets missed
- both become "truth"
- neither is trustworthy

That is exactly what we are stopping.

## Correct structure

Each product home must contain:
1. `PRODUCT_HOME.md`
2. `FILE_MANIFEST.json`

`PRODUCT_HOME.md` is the human-facing canonical product home.

`FILE_MANIFEST.json` is the machine-facing ownership map.

## Product-development completeness gate

The product folder is not just a storage location. It is the system's working surface for discovering whether the product vision is complete enough to move forward.

Before a product is allowed to advance to founder-packet / architect handoff / blueprinting, the system must look for missing intent, unresolved tradeoffs, and unclear vision.

If the product is not sufficiently defined, the system must explicitly say so.

Required behavior:
- identify what is known
- identify what is assumed
- identify what is missing
- identify what is contradictory
- identify what must be decided before blueprinting
- return those gaps to Adam through Lumin as a product-development conversation, not silently push them downward

Minimum output for an incomplete product:
- readiness state
- blocking gaps
- open decisions
- recommended next conversation topics
- whether the product is ready for:
  - more brainstorming
  - founder packet creation
  - architect handoff
  - blueprint generation

The system must not pretend a product is blueprint-ready when the vision is still under-specified.

## Ownership model

For every file or system mentioned in a product home, it must be labeled as one of:
- `OWNED`
- `SHARED_DEPENDENCY`
- `HISTORY_ONLY`
- `SALVAGE_ONLY`

## Shared dependency rule

If a file or subsystem is shared:
- define it once in the owning product or platform file
- point to it from other products
- do not restate its full spec unless the product-specific integration changes behavior

Allowed:
- short note about why the dependency matters to this product
- exact file path
- integration boundary

Not allowed:
- copying the dependency's full doctrine into every product
- creating multiple competing "source of truth" explanations

## Amendment handling

Amendment files are **retired**. Each product lives in `docs/products/<product-id>/`:

- `PRODUCT_HOME.md` — human-facing canonical spec (header notes former amendment number)
- `FILE_MANIFEST.json` — machine ownership map

Do not create new `docs/projects/AMENDMENT_*.md` files for products. Constitutional rails flow through `docs/constitution/NORTH_STAR_SSOT.md`.

Modules (e.g. SocialMediaOS under MarketingOS) use `docs/products/<parent>/<module>/PRODUCT_HOME.md`.

## Enforcement

New product/runtime `@ssot` tags should point to the canonical product home when the file belongs to that product.

Use amendment files only when the file truly belongs to:
- constitutional law
- cross-product infrastructure
- history / receipts

Verify manifest-owned files: `npm run lifeos:product-home:verify` (also in `builder:preflight`, `lifeos:bp-priority:verify`, CI `ssot-compliance` workflow)

**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md` — mission `CONTENT/`, conversation dumps, gap audits, and amendment receipts are **history/research** unless explicitly marked canonical.

Pre-commit **blocks** staged manifest-owned lifeos/lifere files that regress to:
- `@ssot docs/projects/AMENDMENT_*.md` (retired amendment paths)
- `@ssot docs/products/LIFEOS.md` / `LIFERE.md` (flat redirect stubs)

Pre-commit co-commit accepts `PRODUCT_HOME.md` or `FILE_MANIFEST.json` updates when manifest-owned source files change.

## Conversations convention

All conversations, brainstorms, session dumps, and agent transcripts related to a product live in that product's folder:

```
docs/products/<product-id>/conversations/
  YYYY-MM-DD-topic.md
```

Rules:
- If a conversation is specific to one product → goes in `docs/products/<product-id>/conversations/`
- If cross-product or platform-level → goes in `docs/conversation_dumps/` pending triage
- Cross-product ideas are cataloged in `docs/products/ideavault/PRODUCT_HOME.md`
- IdeaVault (platform tool) is the intake/routing engine that classifies and drops conversations into the right folder

Do not store product-specific conversations in `docs/conversation_dumps/` — that is the triage inbox, not the destination.

## Runtime history convention

Each product must also preserve a product-local execution history that later agents can inspect when debugging regressions, tracing decisions, or reconstructing why the system changed.

Recommended structure:

```
docs/products/<product-id>/history/
  receipts/
  runs/
  decisions/
```

Rules:
- Queue movement for a product must co-update product-local history in the same governed action.
- If `BP_PRIORITY.json` changes a mission state, the linked mission receipt and product-local history trail must be updated too.
- Product-local history is for forensic continuity, not live authority.
- Canonical current truth still lives in `PRODUCT_HOME.md`, `FILE_MANIFEST.json`, and the active mission packet.
- History must be detailed enough that a cold agent can later inspect what changed, why it changed, what evidence existed, and what result followed.
