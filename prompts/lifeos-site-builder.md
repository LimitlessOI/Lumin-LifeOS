# Domain: Site Builder & Prospect Pipeline

## What this domain does
Done-for-you website builder for wellness/health businesses. Scrapes a prospect's existing website, uses AI to build them a modern click-funnel site (Tailwind + Alpine.js), then sends a cold email with a link to the free preview. Full outreach automation: discover → rank → build → send → track views (auto) → track replies (auto) → follow up → close.

**Revenue model:** one-time site build ($997–$1,997) + monthly care plan ($297–$597/mo) + POS affiliate commissions (Jane $50, Mindbody $200, Square up to $2,500).

## Owned files
| File | Purpose |
|---|---|
| `services/site-builder.js` | Core pipeline: scrape → AI generate → quality score → repair → inject tracking pixel → save preview |
| `services/site-builder-quality-scorer.js` | Scores GENERATED HTML quality (0-100, readyToSend gate, A-F grade) |
| `services/site-builder-opportunity-scorer.js` | Scores prospect's EXISTING site for outreach prioritization (0-100, isSpa, isChain flags) |
| `services/prospect-pipeline.js` | Full outreach pipeline: processProspect (Step 0: opportunity score → Step 1: build → Step 2: AI email → Step 3: send → Step 4: DB), listProspects, sendFollowUp, runFollowUpCron |
| `routes/site-builder-routes.js` | All site builder API endpoints |
| `db/migrations/20260313_site_builder_prospect_pipeline.sql` | DB schema: prospect_sites, email_suppressions, outreach_log (includes follow_up_count, last_viewed_at columns) |
| `scripts/site-builder-prospect-discovery.mjs` | CLI: find wellness businesses in a city via Google Places or manual research guidance |
| `scripts/site-builder-batch-rank.mjs` | CLI: batch-score a JSON list of prospects, rank by opportunity score, flag chains/SPAs |
| `scripts/site-builder-pipeline-report.mjs` | CLI: live pipeline analytics report (funnel + rates + warm leads) from Railway |
| `scripts/site-builder-follow-up-cron.mjs` | Operator cron: day-3/day-7 follow-ups for eligible prospects |
| `scripts/site-builder-preview-expiry-cron.mjs` | Operator cron: expire unsold previews after 30 days |
| `scripts/site-builder-live-smoke.mjs` | Live Railway smoke test (verifies qualityReport present) |
| `scripts/verify-site-builder-lane.mjs` | Local lane verifier against manifest assertions |
| `public/overlay/site-builder-landing.html` | Public sales/offer page |
| `public/overlay/site-builder-command-center.html` | Operator dashboard: analyze prospects, build & send, pipeline table |
| `prompts/lifeos-site-builder.md` | THIS FILE — builder domain context |
| `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md` | Monthly design/SEO/conversion brief for AI generation prompts |
| `docs/projects/AMENDMENT_05_SITE_BUILDER.md` | SSOT amendment |
| `docs/projects/AMENDMENT_05_SITE_BUILDER.manifest.json` | Lane verifier manifest |

## DB Tables (ALL confirmed in Neon production)
| Table | Key columns |
|---|---|
| `prospect_sites` | client_id, business_url, contact_email, contact_name, business_name, preview_url, email_sent, status, deal_value, pos_partner, industry, metadata (JSONB), follow_up_count, last_follow_up_at, last_contacted_at, last_viewed_at, created_at, updated_at |
| `email_suppressions` | email, reason, suppressed, suppressed_at |
| `outreach_log` | channel, recipient, subject, body, status, external_id, metadata, sent_at |

**prospect_sites.status values:** `built` → `sent` → `viewed` → `replied` → `converted` | `qa_hold` | `lost` | `expired`

## API surface (mounted at /api/v1/sites)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/build` | key | Build site from URL — returns previewUrl + qualityReport |
| POST | `/prospect` | key | Build + score existing site + send personalized cold outreach email |
| POST | `/bulk-prospect` | key | Up to 20 prospects in batch |
| POST | `/analyze` | key | Opportunity score for prospect's EXISTING site (returns score, grade, painPoints, strengths, isChain, isSpa) |
| GET | `/previews` | key | List all built preview sites |
| GET | `/prospects` | key | CRM pipeline view (returns `{ ok, count, prospects: [...] }`) |
| GET | `/dashboard` | key | Pipeline stats (returns `{ ok, pipeline: { total, built, qa_hold, sent, viewed, replied, converted, total_revenue } }`) |
| PATCH | `/prospects/:clientId/status` | key | Update prospect status + deal_value |
| POST | `/follow-up` | key | Send follow-up email to a prospect by clientId |
| GET | `/pos-partners` | key | POS commission partner list |
| GET | `/preview-view` | none | Tracking pixel — auto-marks prospect 'viewed' when preview opened (called by injected pixel in generated sites, query param: `?id=clientId`) |
| POST | `/email-reply-webhook` | token | Postmark inbound webhook — auto-marks prospect 'replied' when they reply to cold email |

## Key automation flow
```
npm run site-builder:discover --city='Austin, TX' --type=yoga
  ↓ JSON array of businesses
npm run site-builder:rank --input=discovered.json --top=10
  ↓ Ranked by opportunity score, chains/SPAs flagged
POST /api/v1/sites/prospect { businessUrl, contactEmail, contactName }
  ↓ Scores their site → builds mock → sends email → records in DB
Prospect opens preview → tracking pixel fires → status = 'viewed' (auto)
Prospect replies → Postmark webhook → status = 'replied' (auto)
npm run site-builder:report    ← view pipeline health anytime
node scripts/site-builder-follow-up-cron.mjs   ← day-3/7 follow-ups
```

## Key business rules
1. Cold emails MUST track consent — never email same address twice without consent
2. `skipEmail: true` must work for building sites without sending emails
3. Preview sites expire after 30 days unless prospect converts (run preview-expiry-cron.mjs)
4. Quality gate: `qualityReport.readyToSend === false` → status = `qa_hold` — never auto-send weak previews
5. Failed follow-up sends must NOT increment `follow_up_count`
6. All generated testimonials must be labeled "illustrative" until replaced with real ones
7. `isChain: true` prospects (franchises, multi-location chains) score max 30 — they already have agencies
8. `isSpa: true` prospects (JavaScript SPAs, bot-blocked CDN responses) score max 20 — can't analyze accurately
9. Opportunity scorer runs BEFORE building the site — top 3 pain points personalize the cold email
10. `opportunityScore` 0-100: higher = worse existing site = pitch first

## Opportunity scorer details
The scorer (`services/site-builder-opportunity-scorer.js`) analyzes a prospect's EXISTING site to determine outreach priority.

Checks (12 criteria):
- Slow response (>3000ms) — 15pts
- No mobile viewport — 15pts
- No SSL — 10pts
- No online booking — 12pts (detects 30+ platforms: Calendly, Acuity, Jane.app, Mindbody, Fresha, Boulevard, Phorest, Timely, Zenoti, Meevo, Booker, Cliniko, SimplePractice, WooCommerce booking plugins, + regex for /book /booking /appointments in hrefs)
- No page title — 8pts
- No meta description — 8pts
- No social proof — 10pts
- No clear CTA — 10pts
- Old copyright year (pre-2022) — 6pts
- No schema markup — 4pts
- Old HTML patterns (font tags, tables-for-layout) — 6pts
- Thin content (<2000 chars) — 6pts

Returns: `{ url, opportunityScore (0-100), grade (A-F), painPoints[], strengths[], recommendation, responseTimeMs, isChain, isSpa, analyzed, error }`

**Chain cap:** if site has "franchise", "find a location", "X+ locations" language → capped at score 30
**SPA cap:** if HTML < 8KB + framework markers OR HTML < 3KB + response < 200ms → capped at score 20

## Quality scorer details
The quality scorer (`services/site-builder-quality-scorer.js`) grades GENERATED preview sites before sending.

- `readyToSend: true/false` — gate for email sending
- `grade: A-F` — letter grade
- `scorePct` — normalized percentage score
- Sites below threshold land in `qa_hold` — review before outreach

## Pattern for new services in this domain
```js
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Brief description of what this service does.
 */

export function createMyService(pool) {
  return {
    async myMethod(input) {
      // implementation
    }
  };
}
```

## Pattern for new scripts in this domain
```js
#!/usr/bin/env node
/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 * Brief description and CLI usage.
 */

import 'dotenv/config';
// Use global fetch (Node 18+), AbortController for timeouts
// process.stderr for human messages, process.stdout for JSON output
// 500ms delay between external fetches to be polite
```

## Critical model guidance — follow EXACTLY or commit will fail
- **NO puppeteer, NO jsdom, NO cheerio** — use `fetch` + regex/string operations only
- **NO jsdom** — not in package.json, will crash on Railway
- **NO node-fetch** — not in package.json; use global `fetch` (Node 18+)
- **NO TypeScript annotations** — plain JavaScript only (`function foo(url)` not `function foo(url: string)`)
- **NO asterisk shorthand params** — use plain names like `requireKey` not `*rk` or `*ccm`
- **NO `module.exports`** — use ESM `export function` or `export class`
- **NO `import dotenv from 'dotenv/config'`** — correct form is `import 'dotenv/config'` (side-effect import, no named default)
- **API response shapes to know:**
  - `/api/v1/sites/dashboard` returns `{ ok, pipeline: { total, built, qa_hold, sent, viewed, replied, converted, total_revenue } }`
  - `/api/v1/sites/prospects` returns `{ ok, count, prospects: [...] }` (NOT a bare array)
  - prospect row columns are snake_case: `business_name`, `contact_email`, `created_at`, `preview_url`

## What NOT to touch
- `server.js` — protected boundary, never add feature logic here
- `startup/register-runtime-routes.js` — wired by Conductor after builder commits
- DB migrations from prior sessions (only ADD new migration files, never modify existing ones)
- `COMMAND_CENTER_KEY`, `GITHUB_TOKEN`, `DATABASE_URL` — never log or expose values

## Next approved tasks (in priority order)
1. Add A/B email subject line test tracking to `outreach_log` — store `variant` field + measure open/reply rate by variant
2. Add `GET /api/v1/sites/prospects/:clientId` endpoint returning single prospect detail with full metadata + qualityReport
3. Build a "warm lead notify" cron — when a prospect moves to `viewed` or `replied`, send Adam a Slack/SMS notification
4. Improve quality scorer: add check for visible phone number, check for Google Maps embed, check for SSL trust badge
5. Add preview site video embed — if prospect has YouTube channel, embed their latest video on their preview (already coded in site-builder.js for youtubeChannelId, need to wire to discovery)
