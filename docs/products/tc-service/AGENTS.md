<!-- SYNOPSIS: TC Service — Agent Cold-Start Entry -->

# TC Service — Agent Cold-Start Entry

**You are working on TC Service (Transaction Coordinator back-office automation).**

## Read first

1. `docs/products/tc-service/PRODUCT_HOME.md` — mission, ownership, readiness state
2. `docs/products/tc-service/FILE_MANIFEST.json` — every file this product owns
3. `docs/products/tc-service/PRODUCT_HOME.md` — law, technical spec, session receipts
4. `docs/products/AUTHORITY_BOUNDARIES.md` — what you can change vs. what is shared

## What this product does

Automated TC back-office. Handles SkySlope document intake from email, deadline tracking, GLVAR dues monitoring, MLS investor deal scanning, TC pricing/billing (3 tiers), eXp Okta browser automation, agent portal + client portal, milestone communication, morning digest, weekly seller reports.

## Owned code boundaries

You may freely modify:
- `routes/tc-routes.js`, `routes/mls-routes.js`
- `routes/boldtrail-routes.js`, `routes/boldtrail-coaching-routes.js` (TC-facing BoldTrail calls only)
- All `services/tc-*.js`, `services/glvar-monitor.js`, `services/mls-deal-scanner.js`, `services/email-triage.js`
- `public/tc/` HTML/JS

You must NOT modify without reading shared ownership rules:
- `services/lifere-boldtrail-bridge.js` — owned by BoldTrail / LifeRE
- `services/ai-council*.js` — owned by AMENDMENT_01
- `services/billing*.js` — owned by AMENDMENT_03

## Current state (as of 2026-06-27)

- Most code built. No mission pack exists. Can not run via BuilderOS.
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission ID in BP_PRIORITY.json.
- No formal acceptance test defined.

## Next priority for a cold agent

If you are here to write code: read AMENDMENT_17 first. All new TC features must add a Change Receipt row to AMENDMENT_17 and update the manifest's `last_updated`.

If you are here to mission-ize this product: write `builderos-reboot/MISSIONS/PRODUCT-TC-SERVICE-V1-0001/FOUNDER_PACKET.md` then `BLUEPRINT.json` then add to `builderos-reboot/BP_PRIORITY.json`.

## Amendment coupling

Every `.js` file you touch in `routes/tc-*.js` or `services/tc-*.js` must have `@ssot AMENDMENT_17_TC_SERVICE.md` and the amendment must be updated in the same commit.

Pre-commit hook will block if you violate this.
