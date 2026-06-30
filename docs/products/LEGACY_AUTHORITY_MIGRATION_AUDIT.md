<!-- SYNOPSIS: Legacy authority migration audit — what still has value before archive -->

# Legacy Authority Migration Audit

**Purpose:** decide what can move to history, what must be retargeted first, and what still contains valuable doctrine, templates, or mechanics.

**Machine inventory:** [`docs/history/legacy-history-salvage/LEGACY_AUTHORITY_INVENTORY.json`](../history/legacy-history-salvage/LEGACY_AUTHORITY_INVENTORY.json)

## Verdict

Do **not** delete or archive amendment-era material yet.

The flat product stubs are mostly safe and low-risk. The real problem is that live code, schemas, and legacy indexes still use amendment vocabulary and dead amendment paths.

## What is already low-risk

### Top-level product files in `docs/products/`

Most of these are already **redirect stubs**.

Examples:
- `docs/products/LIFEOS.md`
- `docs/products/BUILDEROS.md`
- `docs/products/MARKETINGOS.md`

Value:
- preserve old links
- preserve former amendment lineage
- point cold agents to canonical product homes

Risk:
- low, as long as runtime `@ssot` tags do not point at them

Recommended action:
- keep for now
- remove only after all old links, prompts, and human habits no longer depend on them

## What has clear salvage value

### `docs/projects/AMENDMENT_READINESS_CHECKLIST.md`

Value worth preserving:
- forces competitor analysis
- forces future-risk thinking
- forces adaptability strategy
- forces build-ready gates before autonomous execution

What is wrong:
- framed around amendment files and old readiness flow

Recommended action:
- promote best parts into canonical product-development / founder-packet gate
- then archive or rename the old file out of active authority

### `docs/projects/AMENDMENT_TEMPLATE.md`

Value worth preserving:
- explicit scope / non-scope
- owned vs protected files
- anti-drift assertions
- handoff section
- runbook section
- decision debt section

What is wrong:
- still assumes `AMENDMENT_XX` as the active product authority shape

Recommended action:
- merge best sections into product-home / founder-packet / blueprint templates
- then archive the amendment-era template

### `docs/projects/manifest.schema.json`

Value worth preserving:
- machine contract for project verification
- segment execution contract
- readiness and stability metadata

What is wrong:
- still requires `amendment_path`
- keeps old vocabulary alive in API and data expectations

Recommended action:
- retarget schema fields to canonical product-home language
- only then archive or rename the old schema

### `docs/projects/INDEX.md`

Value worth preserving:
- historical registry of former amendment lineage
- repo archaeology
- older priority context
- lost idea breadcrumbs

What is wrong:
- describes a world where amendments are still live project authority
- points to many files that no longer exist
- can mislead cold agents if treated as current truth

Recommended action:
- salvage historical lineage and unique ideas
- archive as history index, not active project law

## Highest-risk live dependencies

These are the files that must be fixed before archive work:

### `services/voice-rail-v1.js`

Current issue:
- reads `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
- that file does not exist

Value worth preserving:
- context health summary
- founder-visible honesty receipt
- product brief loading path

Required migration:
- replace dead amendment brief load with canonical LifeOS brief or a dedicated extracted brief file under `docs/products/lifeos/`

### `services/capability-map.js`

Current issue:
- scans `docs/projects/AMENDMENT_*.md`
- assumes the old amendment index is the system map

Value worth preserving:
- competitor idea mapping
- architecture overlap detection
- extension-point routing

Required migration:
- scan canonical product registry + product homes + IdeaVault / conversation triage instead of amendment files

### `routes/blueprint-intake-routes.js`

Current issue:
- public API still uses `amendment_file` and `amendment_text`

Value worth preserving:
- three-flow intake model
- gap chat
- ARC review and execution handoff

Required migration:
- rename input model around canonical product sources, founder packets, or source documents
- keep the workflow, remove the amendment dependency

### `services/blueprint-intake.js`

Current issue:
- prompt and defaults still speak amendment-first language
- default `ssot_tag` still points at `docs/projects/AMENDMENT_XX.md`

Value worth preserving:
- gap detection
- phase-1 scaffolding fallback
- blueprint normalization

Required migration:
- switch generated authority to canonical product-home / product packet vocabulary

### `routes/project-governance-routes.js`

Current issue:
- reads and returns `amendment_path`
- readiness queue still points at `docs/projects/AMENDMENT_READINESS_CHECKLIST.md`

Value worth preserving:
- project queue visibility
- segment tracking
- pending founder blockers
- estimation accuracy tracking

Required migration:
- replace `amendment_path` with canonical product home or product packet path
- retarget readiness docs to the new product-development gate

## Broken-reference reality

The system currently contains runtime and documentation references to missing files such as:
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
- `docs/projects/AMENDMENT_04_AUTO_BUILDER.md`
- `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`
- `docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md`
- `docs/projects/AMENDMENT_38_IDEA_VAULT.md`

This means some of the legacy layer is not just old, it is **dead and misleading**.

## Safe migration order

1. Inventory and classify every flat product file and legacy project file.
2. Retarget live runtime code away from amendment paths.
3. Retarget machine schemas and API vocabulary away from amendment fields.
4. Promote any surviving checklist/template value into canonical product-development doctrine.
5. Archive the legacy files into `docs/history/legacy-history-salvage/`.
6. Remove remaining active references to amendment-era product authority.

## Rule for archive

Nothing moves to legacy merely because it is old.

A file is archive-safe only after one of these is true:
- it is a redirect stub with no live authority role
- its valuable sections have been promoted into canonical doctrine
- all live code and machine contracts have been retargeted away from it
- it is confirmed to be history-only with no runtime dependency
