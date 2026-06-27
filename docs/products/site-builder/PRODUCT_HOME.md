<!-- SYNOPSIS: Canonical product home — Site Builder & Prospect Pipeline -->

# Site Builder Product Home

**Canonical home:** this file  
**Product id:** `site-builder`  
**Primary runtime surface:** `/api/v1/sites/*` (API), command-center overlay (operator UI)  
**Law anchor:** `docs/projects/AMENDMENT_05_SITE_BUILDER.md`  
**Authority boundaries:** `docs/products/AUTHORITY_BOUNDARIES.md`

## Mission

Done-for-you website builder for wellness/health businesses. Scrapes a prospect's existing website, uses AI to build a modern click-funnel site with SEO, automated blog content, YouTube video integration, and a booking/POS system. Sends a cold email with a link to their free preview site to sell them the upgrade.

**Mission statement:** Find businesses with bad websites → build their dream site in 2 minutes → email them the link → close the deal.

## Readiness state

`PARTIAL_CODE_PRESENT`

Code is complete. DB tables confirmed live in Neon production. Blocked only on 4 Railway env var values. No BuilderOS mission pack exists yet; one is needed before this can re-enter the autonomous queue.

**Hard blocker:** Railway env vars not set:
- `POSTMARK_SERVER_TOKEN` — email sending
- `EMAIL_FROM` — sender address / `SITE_BASE_URL` — preview URL base
- `EMAIL_PROVIDER` — provider selector
- (Optional) `AFFILIATE_JANE_APP_URL`, `AFFILIATE_MINDBODY_URL`, `AFFILIATE_SQUARE_URL`

## Owned runtime files

Defined in full at `docs/products/site-builder/FILE_MANIFEST.json`.

Routes:
- `routes/site-builder-routes.js` — build, prospect, bulk-prospect, CRM, dashboard
- `routes/site-builder-discovery-routes.js`
- `routes/site-builder-launch-readiness-routes.js`
- `routes/site-builder-pipeline-report-routes.js`

Services:
- `services/site-builder.js` — core: scrape → AI generate → deploy
- `services/site-builder-quality-scorer.js` — conversion/accessibility QA + send gate
- `services/prospect-pipeline.js` — mock site + cold email outreach
- `services/site-builder-postmark-helper.js` — Postmark outreach send
- `services/site-builder-opportunity-scorer.js` — prospect scoring
- `services/site-builder-prospect-ranker.js` — batch ranking
- `services/site-builder-revenue-service.js` — pipeline revenue tracking
- `services/site-builder-email-templates.js` — email copy

DB tables (live in Neon production):
- `prospect_sites` — CRM for all prospects
- `email_suppressions` — bounce/complaint protection
- `outreach_log` — every email attempt audit trail

Research:
- `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md` — design/SEO brief injected into prompts

## Receipts

No formal mission receipts. No BuilderOS acceptance command defined yet.

## Revenue model

| Stream | Amount |
|--------|--------|
| One-time site build | $997–$1,997 per client |
| Monthly care plan | $297–$597/mo (recurring MRR) |
| POS referral: Jane App | ~$50/referral |
| POS referral: Mindbody | ~$200/referral |
| POS referral: Square | up to $2,500/referral |

## Shared dependencies

| System | Owner | Pointer |
|--------|-------|---------|
| AI Council (site generation) | Platform | `docs/projects/AMENDMENT_01_AI_COUNCIL.md` |
| Email / Postmark | Platform | `core/notification-service.js` |
| Command Center operator UI | Platform | `docs/projects/AMENDMENT_12_COMMAND_CENTER.md` |
| BuilderOS queue | Machine | `builderos-reboot/BP_PRIORITY.json` |

## Exact next steps to become blueprint-ready

1. Set the 4 Railway env vars above.
2. Write `FOUNDER_PACKET.md` — what does "this product works" mean to you as the operator.
3. Convert to `BLUEPRINT.json` with acceptance criteria.
4. Add to `builderos-reboot/BP_PRIORITY.json`.

No code needed. Infrastructure is built. Only env vars + mission formalization needed.

## History anchor

`docs/projects/AMENDMENT_05_SITE_BUILDER.md` — full law, DB schema, API endpoints, email flow, session receipts.
