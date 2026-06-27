<!-- SYNOPSIS: Canonical product home — LifeRE -->

# LifeRE Product Home

**Canonical home:** this file  
**Product id:** `lifere`  
**Primary runtime surface:** `/overlay/lifeos-app.html`  
**Law anchors:** `docs/projects/AMENDMENT_LIFERE.md`, `docs/constitution/NORTH_STAR.md`  
**Machine queue:** `builderos-reboot/BP_PRIORITY.json`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

LifeRE is the real-estate business operating system.

It owns the business-specific command, pipeline, coaching, communication, marketing, and performance layers for a real-estate operator, while reusing LifeOS as the human shell underneath.

## Ownership model

LifeRE owns:
- real-estate-specific operating behavior
- business command center
- RE-specific performance and communication layers
- RE-specific overlays, routes, and service adapters

LifeRE does **not** own:
- the full LifeOS personal shell
- BoldTrail itself
- TC system of record
- MarketingOS platform law

Those are dependencies or sibling systems.

## Owned runtime files

Primary owned files are defined in:
- `docs/products/lifere/FILE_MANIFEST.json`

High-signal owned surfaces:
- `services/lifere-os-v1.js`
- `services/lifere-boldtrail-bridge.js`
- `routes/lifere-os-routes.js`
- `public/overlay/lifeos-lifere.html`

## Shared dependencies

LifeRE depends on:
- LifeOS shell and Chair front door
- BoldTrail as CRM system of record
- TC services
- MarketingOS shared adapters and doctrine

Use pointers, not duplication.

## Active missions

Active LifeRE mission:
- `PRODUCT-LIFERE-OS-V1-0001`

## Current truth

Current honest state:
- `TECHNICAL_PASS_ONLY` — machine + agent alpha green; **Point B blocked on founder confirm only**

Founder close path (one action):
1. Open `/overlay/lifeos-app.html?page=lifeos-lifere.html` (or click Point B strip)
2. **Run Alpha Daily Cycle**
3. **Confirm Alpha PASS** with your quote (12+ characters)

Meaning:
- acceptance passed mechanically
- founder usability has not yet been confirmed
- Point B is not honestly complete

## History anchors

Use these for law/history/receipts, not as the primary product home:
- `docs/projects/AMENDMENT_LIFERE.md`
- `builderos-reboot/MISSIONS/PRODUCT-LIFERE-OS-V1-0001/`
- `docs/LIFERE_*`

## Rule for agents

If a file belongs to LifeRE product behavior, `@ssot` should point here or to `docs/products/lifere/FILE_MANIFEST.json` for ownership lookup.

Do not default back to `AMENDMENT_LIFERE` unless the change is law/history/receipt oriented.

