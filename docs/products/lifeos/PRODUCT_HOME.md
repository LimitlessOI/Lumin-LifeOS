<!-- SYNOPSIS: Canonical product home — LifeOS -->

# LifeOS Product Home

**Canonical home:** this file  
**Product id:** `lifeos`  
**Primary runtime surface:** `/lifeos`  
**Law anchors:** `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`, `docs/constitution/NORTH_STAR.md`  
**Machine queue:** `builderos-reboot/BP_PRIORITY.json`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

LifeOS is the human operating system.

It is the Chair-facing, truth-first, adaptive shell that helps a person move from who they are to who they intend to become, without manipulation, theater, or fake certainty.

It is also a fluid workspace: the same Lumin surface must be able to pivot the visible shell toward the page, stack, and working lane implied by founder intent instead of forcing the founder to navigate a fixed app manually.

## Ownership model

LifeOS owns the personal operating layer:
- Lumin / Chair front door
- mirror / commitments / integrity / joy
- emotional, family, purpose, identity, decisions
- conversation memory and coaching surfaces

LifeOS does **not** own:
- LifeRE business specialization
- MarketingOS platform doctrine
- TC system of record
- generic platform governance law

Those are dependencies or sibling products.

## Owned runtime files

Primary owned files are defined in:
- `docs/products/lifeos/FILE_MANIFEST.json`

High-signal owned surfaces:
- `services/lumin-chair-orchestrator.js`
- `services/chair-lumin-unified.js`
- `services/chair-system-knowledge.js`
- `services/lifeos-context-router.js`
- `services/lifeos-system-agent.js`
- `routes/lifeos-chat-routes.js`
- `routes/lifeos-core-routes.js`
- `routes/lifeos-family-routes.js`
- `routes/lifeos-emotional-routes.js`
- `routes/lifeos-purpose-routes.js`
- `public/overlay/lifeos-app.html`
- `public/overlay/lifeos-studio-shell.js`

## Shared dependencies

LifeOS depends on shared systems but does not own them:
- platform doctrine and constitutional law
- BuilderOS mission-pack system
- Token accounting / model tiering enforcement
- product queue and Point B lock

Use pointers, not duplication:
- `docs/products/PRODUCT_REGISTRY.json`
- `builderos-reboot/governance/LUMIN_OPERATING_MODEL.json`
- `builderos-reboot/BP_PRIORITY.json`
- `builderos-reboot/POINT_B_TARGET.json`

## Active missions

Active LifeOS product missions:
- `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`
- `PRODUCT-ACTION-INBOX-V1-0001`
- `PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001`
- `PRODUCT-LIFEOS-COMMITMENT-ROUTE-V2-0001`

## Shared-with / crossover products

### LifeRE

LifeRE is a sibling product built on top of LifeOS.

Relationship:
- LifeOS owns the general human shell
- LifeRE owns the real-estate specialization

### Voice Rail

Voice Rail is not an active product.

Status:
- `SCRAPPED_SALVAGE_ONLY`

## History anchors

Use these for law/history/receipts, not as the primary product home:
- `docs/projects/AMENDMENT_21_LIFEOS_CORE.md`
- `docs/conversation_dumps/`
- `builderos-reboot/MISSIONS/PRODUCT-*`

## Rule for agents

If a file belongs to LifeOS product behavior, `@ssot` should point here or to `docs/products/lifeos/FILE_MANIFEST.json` for ownership lookup.

Do not default back to `AMENDMENT_21` unless the change is truly constitutional/history-level.

## 2026-06-27 founder path hardening receipts

- Founder advice prompts that are really prioritization or judgment calls must stay in chair counsel; they must not fall into verified-web-search fallback just because they end with a question mark.
- `GET /api/v1/lifeos/auth/me` now falls back to founder handle lookup for valid handle-only JWTs, not just command-key fallback, so founder-shell auth does not degrade into a false `404 User not found`.
- Removed 66 probe-debris HTML comments (alpha/parity/point-b probe labels) from `public/overlay/lifeos-app.html` lines 2337-2402.
- Replaced Tailwind CDN Play script (`cdn.tailwindcss.com`) with inline minimal CSS in `lifeos-dashboard.html`, `lifeos-victory-vault.html`, and `site-builder-command-center.html` — eliminates the "Tailwind CDN is for development only" console.warn from the founder shell iframe.

## 2026-06-28 merge receipts

- `public/overlay/sw.js` CACHE_NAME bump (`lifeos-1782610487963`) from BuilderOS CSS patch autonomy run — flushes service worker cache to deliver CSS overlay changes to founder shell.

## 2026-06-28 closure truth receipts

- `scripts/run-ui-alpha-gate.mjs` and `scripts/audit-founder-alpha-ready.mjs` now explicitly preserve the difference between `CLEARED_FOR_FOUNDER_ALPHA` and founder-closed Alpha / Point B.
- Founder chat/build proof now treats build transport as a first-class truth field; async founder-job results are hydrated before founder poll/readback so bare `PASS` cannot hide missing commit/deploy truth.
- Founder async build-job polling now refreshes transport proof from live deploy SHA and founder-surface evidence instead of assuming Railway can prove ancestry from local git state.
- Founder async build workers no longer try to finish deploy/live proof inline; they now persist committed truth and let founder poll/readback keep the job `RUNNING` until transport proof or live-marker proof is actually earned.
- Founder-triggered proof refresh now carries the exact commit SHA the build just created, so the runtime does not accidentally rebuild an older `main` head while founder proof is still waiting.
- Founder surgical HTML-comment builds now return pending live-marker proof instead of false final PASS; founder poll/readback is responsible for promoting that job only after deploy parity plus live marker readback are both real.
- `builderos-reboot/PRODUCT_READINESS_REPORT.json` is now part of the active LifeOS authority chain for readiness surfacing, but it does not override Point B or founder-usability truth.
