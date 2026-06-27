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

Old amendment files become:
- law anchors
- history anchors
- receipt anchors

They are **not** the primary product home once a canonical product home exists.

## Enforcement

New product/runtime `@ssot` tags should point to the canonical product home when the file belongs to that product.

Use amendment files only when the file truly belongs to:
- constitutional law
- cross-product infrastructure
- history / receipts

Verify manifest-owned files: `npm run lifeos:product-home:verify` (also in `builder:preflight`, `lifeos:bp-priority:verify`, CI `ssot-compliance` workflow)

**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md` — mission `CONTENT/`, conversation dumps, gap audits, and amendment receipts are **history/research** unless explicitly marked canonical.

Pre-commit **blocks** staged manifest-owned lifeos/lifere files that regress to:
- `@ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md` / `AMENDMENT_LIFERE.md`
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
- Cross-product ideas are cataloged in `docs/projects/AMENDMENT_38_IDEA_VAULT.md`
- IdeaVault (platform tool) is the intake/routing engine that classifies and drops conversations into the right folder

Do not store product-specific conversations in `docs/conversation_dumps/` — that is the triage inbox, not the destination.

