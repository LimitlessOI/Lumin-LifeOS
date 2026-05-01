# Domain: Site Builder & Prospect Pipeline

## What this domain does
Done-for-you website builder for wellness/health businesses. Scrapes a prospect's existing website, uses AI to build them a modern click-funnel site (Tailwind + Alpine.js), then sends a cold email with a link to the free preview.

**Revenue model:** one-time site build ($997–$1,997) + monthly care plan ($297–$597/mo) + POS affiliate commissions (Jane $50, Mindbody $200, Square up to $2,500).

## Owned files
| File | Purpose |
|---|---|
| `services/site-builder.js` | Core pipeline: scrape → AI generate → score → save preview |
| `services/site-builder-quality-scorer.js` | Scores generated HTML (0-100, readyToSend gate) |
| `services/site-builder-opportunity-scorer.js` | Scores prospect's EXISTING site (opportunity score for outreach prioritization) |
| `services/prospect-pipeline.js` | DB layer: processProspect, listProspects, sendFollowUp, runFollowUpCron |
| `services/site-builder-email-templates.js` | Pure email templates: initial, followup3, followup7 |
| `routes/site-builder-routes.js` | All site builder API endpoints |
| `db/migrations/20260313_site_builder_prospect_pipeline.sql` | DB schema: prospect_sites, email_suppressions, outreach_log |
| `scripts/site-builder-follow-up-cron.mjs` | Operator cron: day-3/day-7 follow-ups |
| `scripts/site-builder-preview-expiry-cron.mjs` | Operator cron: expire unsold 30-day-old previews |
| `scripts/site-builder-live-smoke.mjs` | Live Railway smoke test |
| `scripts/verify-site-builder-lane.mjs` | Local lane verifier |
| `public/overlay/site-builder-landing.html` | Public sales/offer page |
| `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md` | Monthly design/SEO/conversion brief for generation prompts |

## DB Tables (ALL confirmed in Neon production)
| Table | Key columns |
|---|---|
| `prospect_sites` | client_id, business_url, contact_email, business_name, preview_url, email_sent, status, deal_value, quality_score, quality_report (JSONB), follow_up_count, last_follow_up_at, metadata, created_at |
| `email_suppressions` | email, reason, suppressed, suppressed_at |
| `outreach_log` | recipient, subject, status, sent_at |

## API surface (mounted at /api/v1/sites)
| Method | Path | Purpose |
|---|---|---|
| POST | `/build` | Build site from URL — returns previewUrl + qualityReport |
| POST | `/prospect` | Build + send cold outreach email |
| POST | `/bulk-prospect` | Up to 20 in batch |
| POST | `/analyze` | Opportunity score for prospect's EXISTING site (NEW) |
| GET | `/previews` | List built previews |
| GET | `/prospects` | CRM pipeline view |
| GET | `/dashboard` | Revenue pipeline stats |
| PATCH | `/prospects/:clientId/status` | Mark converted, log deal value |
| POST | `/follow-up` | Send follow-up email |
| GET | `/pos-partners` | POS commission partner list |

## Key business rules
1. Cold emails MUST track consent — never email same address twice without consent
2. `skipEmail: true` must work for building sites without sending emails
3. Preview sites expire after 30 days unless prospect converts
4. Quality gate: `qualityReport.readyToSend === false` → status = `qa_hold`; never auto-send weak previews
5. Failed follow-up sends must NOT increment follow_up_count
6. All generated testimonials must be labeled "illustrative" until replaced with real ones
7. Generated sites must disclose POS affiliate relationship

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

## Critical model guidance
- **NO puppeteer, NO jsdom, NO cheerio** in new services — use `fetch` + regex/string operations only
- **NO jsdom** — it is not in package.json and will crash on Railway
- **NO TypeScript annotations** — plain JavaScript only (`function foo(url)` not `function foo(url: string)`)
- **NO asterisk patterns** in destructured params — use plain names like `requireKey` not `*rk`
- **NO `---METADATA---`** in code output — that is a builder protocol separator, not code
- Wrap async functions in try/catch with proper error propagation
- Use `export function` or `export class` (ESM), never `module.exports`
- Use named exports, not default exports (except for class definitions in services)
- For fetch with timeout: `const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000); fetch(url, { signal: controller.signal })`

## What NOT to touch
- `server.js` — it is a protected boundary, never add feature logic here
- `startup/register-runtime-routes.js` — this is wired by the Conductor after builder commits
- DB migrations from prior sessions (only add new migration files)
- `COMMAND_CENTER_KEY`, `GITHUB_TOKEN`, `DATABASE_URL` — never log or expose these values

## Opportunity scoring (key concept)
The opportunity scorer analyzes a prospect's EXISTING website (not ours) to determine how much value we can deliver. Score 0-100:
- **High score (60-100):** Their site is bad — high opportunity — pitch first
- **Low score (0-39):** Their site is already decent — lower priority

Pain points detected: slow response, no mobile meta, no SSL, no booking system, no meta description, no social proof, old copyright year, no schema markup, old HTML patterns, very short content.

Each pain point gets a weight. The final score normalizes to 0-100. The service also returns a `painPoints[]` array with human-readable strings that can be referenced in the cold outreach email.

## Next approved tasks (in priority order)
1. Build `services/site-builder-opportunity-scorer.js` + wire `POST /api/v1/sites/analyze` route into `routes/site-builder-routes.js`
2. Add prospect scoring to the CRM — `GET /api/v1/sites/prospects` should include opportunity_score when available
3. Build a prospect discovery script that helps find wellness businesses to pitch
4. Add A/B email subject tracking to `outreach_log`
5. Build operator site builder command center overlay
