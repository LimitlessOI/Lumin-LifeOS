<!-- SYNOPSIS: Site Builder — Agent Cold-Start Entry -->

# Site Builder — Agent Cold-Start Entry

**You are working on Site Builder (done-for-you website builder for wellness businesses).**

## Read first

1. `docs/products/site-builder/PRODUCT_HOME.md` — mission, ownership, readiness state, hard blocker
2. `docs/products/site-builder/FILE_MANIFEST.json` — every file this product owns
3. `docs/projects/AMENDMENT_05_SITE_BUILDER.md` — law, technical spec, DB schema, session receipts
4. `docs/products/AUTHORITY_BOUNDARIES.md` — what you can change vs. what is shared

## What this product does

Scrapes a wellness business prospect's existing website, uses AI to build a modern conversion-optimized site (blog, YouTube, POS bookings, SEO), emails them a link to their free preview, and sells them the upgrade. Pipeline CRM tracks all prospects, email suppression/log prevents compliance issues.

## The hard blocker (check this before writing any code)

The product is code-complete. It is blocked on 4 Railway env vars:
- `POSTMARK_SERVER_TOKEN`
- `EMAIL_FROM`
- `SITE_BASE_URL`
- `EMAIL_PROVIDER`

These must be set in Railway before Site Builder can run its cold outreach in production.
**Do not write new code as a workaround for missing env vars.** Set them via Railway.

## Owned code boundaries

You may freely modify:
- `routes/site-builder-routes.js`, `routes/site-builder-discovery-routes.js`
- `routes/site-builder-launch-readiness-routes.js`, `routes/site-builder-pipeline-report-routes.js`
- All `services/site-builder*.js`, `services/prospect-pipeline.js`

You must NOT modify without reading shared ownership rules:
- `core/notification-service.js` — platform-owned email sending layer
- `services/ai-council*.js` — owned by AMENDMENT_01

## Current state (as of 2026-06-27)

- Code complete. DB confirmed in Neon production (3 tables).
- Blocked on 4 Railway env vars. No BuilderOS mission pack.
- No FOUNDER_PACKET.md, no BLUEPRINT.json, no mission ID in BP_PRIORITY.json.

## Next priority for a cold agent

Option 1 (immediate value): Set the 4 Railway env vars. No code needed.  
Option 2 (to mission-ize): Write `builderos-reboot/MISSIONS/PRODUCT-SITE-BUILDER-V1-0001/FOUNDER_PACKET.md`.

## Amendment coupling

Every `.js` file you touch in `routes/site-builder*.js` or `services/site-builder*.js` must have `@ssot AMENDMENT_05_SITE_BUILDER.md` and the amendment must be updated in the same commit.

Pre-commit hook will block if you violate this.
