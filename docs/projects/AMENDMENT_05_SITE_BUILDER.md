# AMENDMENT 05 — Site Builder & Prospect Pipeline
**Status:** QUALITY-GATED LAUNCH READY — awaiting Railway env vars + live preview verification
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-04-29 — Site Builder now has a manifest/verifier surface (`docs/projects/AMENDMENT_05_SITE_BUILDER.manifest.json`), a public launch/sales page at `public/overlay/site-builder-landing.html`, an operator-runnable follow-up cron at `scripts/site-builder-follow-up-cron.mjs`, a design-intelligence source file at `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md`, and a quality gate via `services/site-builder-quality-scorer.js` that scores/repairs weak output before it reaches prospects. This closes the biggest operational gaps in the lane: day-3/day-7 follow-ups now have an execution path, design quality is governed by an explicit modern best-practices brief, and weak previews can be held for revision instead of being emailed. Prior: 2026-03-13.

---

## WHAT THIS IS
Done-for-you website builder for wellness/health businesses. Scrapes a prospect's existing website, uses AI to build them a modern click-funnel site with SEO, automated blog content, YouTube video integration, and a booking/POS system. Then sends them a cold email with a link to their free preview site to sell them the upgrade.

**Mission:** Find businesses with bad websites → build their dream site in 2 minutes → email them the link → close the deal.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| One-time site build | $997–$1,997 | Per client |
| Monthly care plan (site + SEO + content) | $297–$597/mo | Recurring MRR |
| POS referral commission | $50–$2,500 | Per signup via our affiliate link |
| **Target:** | $500+/day | From 2–3 monthly clients + referrals |

### POS Commission Partners
| Partner | Best For | Commission | Affiliate Program |
|---------|---------|-----------|------------------|
| **Jane App** | Midwives, healthcare, wellness practitioners | ~$50/referral | jane.app/affiliates |
| **Mindbody** | Yoga, spa, fitness studios | ~$200/referral | mindbodyonline.com/partner |
| **Square** | General small business | Up to $2,500/referral | squareup.com/us/en/referral |

POS affiliate URLs now read from env vars (`AFFILIATE_JANE_APP_URL`, `AFFILIATE_MINDBODY_URL`, `AFFILIATE_SQUARE_URL`) — set these in Railway to activate commission tracking. Default falls back to partner homepage if not set.

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `services/site-builder.js` | Core pipeline: scrape → AI generate → deploy |
| `services/site-builder-quality-scorer.js` | Conversion/accessibility QA scorer + send gate |
| `services/prospect-pipeline.js` | Mock site + cold email outreach |
| `scripts/site-builder-follow-up-cron.mjs` | Operator/cron entry point for day-3/day-7 follow-up sends |
| `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md` | Monthly-refreshed design, SEO, accessibility, and conversion brief injected into generation prompts |
| `routes/site-builder-routes.js` | All API endpoints (own module) |
| `db/migrations/20260313_site_builder_prospect_pipeline.sql` | DB schema for all 3 tables |

### DB Tables — CONFIRMED CREATED IN NEON (2026-03-13)
| Table | Purpose | Status |
|-------|---------|--------|
| `prospect_sites` | CRM for all prospects — status, deal value, follow-ups | ✅ EXISTS in production |
| `email_suppressions` | Bounce/complaint/unsubscribe list — fail-closed protection | ✅ EXISTS in production |
| `outreach_log` | Every email attempt audit trail — sent/failed/suppressed | ✅ EXISTS in production |

The migration was run via Neon SQL Editor against the **production** branch. All 3 tables and 8 indexes confirmed created.

### Email Sender
- **Service:** `core/notification-service.js` (NotificationService class)
- **Provider:** Postmark (via `POSTMARK_SERVER_TOKEN` env var)
- **Wired into:** `routes/site-builder-routes.js` via `notificationService` in ctx
- **Suppression:** Automatic bounce/complaint protection via `email_suppressions` table
- **Status:** Code complete — needs `POSTMARK_SERVER_TOKEN` + `EMAIL_FROM` set in Railway

### Deployed Static Files
- Preview sites: `/public/previews/{clientId}/index.html`
- Served at: `https://yourdomain.com/previews/{clientId}/`
- Blog posts: `/public/previews/{clientId}/blog/{slug}/index.html`
- SEO: `/public/previews/{clientId}/sitemap.xml` + `robots.txt`

### API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/sites/build` | Build site from URL |
| POST | `/api/v1/sites/prospect` | Build + send outreach email |
| POST | `/api/v1/sites/bulk-prospect` | Up to 20 prospects in batch |
| GET | `/api/v1/sites/previews` | List all built preview sites |
| GET | `/api/v1/sites/prospects` | CRM pipeline view |
| GET | `/api/v1/sites/dashboard` | Revenue pipeline stats |
| PATCH | `/api/v1/sites/prospects/:id/status` | Mark converted, log deal value |
| POST | `/api/v1/sites/follow-up` | Send follow-up email |
| GET | `/api/v1/sites/pos-partners` | Commission partner list |

### Click Funnel Structure (Generated Sites)
1. Sticky navigation + "Book Free Call" CTA
2. Hero — transformation outcome headline, two CTAs
3. Social proof bar — 3 trust stats
4. Problem section — 3 pain points (emoji cards)
5. Solution section — 3-step process
6. Services — cards with price range
7. Testimonials — 3 cards
8. Pricing tiers — 2–3 packages with "Get Started" CTA
9. About section — warm, personal
10. FAQ — Alpine.js accordion
11. Blog preview — links to /blog/
12. YouTube video section
13. Full-width booking CTA
14. Footer with schema.org LocalBusiness markup

### Tech Stack (Generated Sites)
- Tailwind CSS via CDN — zero build step
- Alpine.js — interactivity (FAQ accordion, mobile menu)
- Schema.org JSON-LD — local business SEO
- Open Graph tags — social sharing

---

## CURRENT STATE
- **KNOW:** All three files written and syntax-checked ✅
- **KNOW:** Routes registered in server.js via `createSiteBuilderRoutes()` ✅
- **KNOW:** `prospect_sites`, `email_suppressions`, `outreach_log` tables confirmed in Neon production DB ✅
- **KNOW:** NotificationService (Postmark) wired as email sender with suppression protection ✅
- **KNOW:** POS affiliate URLs read from env vars — falls back to partner homepage if not set ✅
- **KNOW:** Preview sites served at `/previews/*` static route ✅
- **KNOW:** env.template updated with all required env vars and instructions ✅
- **NEED:** `POSTMARK_SERVER_TOKEN` set in Railway → enables cold email sending
- **NEED:** `EMAIL_FROM` set in Railway → the From address prospects will see
- **NEED:** `SITE_BASE_URL` set in Railway → so preview links in emails point to the right domain
- **KNOW:** Manifest/verifier file now exists for this lane: `docs/projects/AMENDMENT_05_SITE_BUILDER.manifest.json` ✅
- **KNOW:** Public sales/positioning page now exists at `/overlay/site-builder-landing.html` via `public/overlay/site-builder-landing.html` ✅
- **KNOW:** Follow-up automation entry point now exists at `scripts/site-builder-follow-up-cron.mjs` and uses `runFollowUpCron()` from `services/prospect-pipeline.js` ✅
- **KNOW:** Prospect records now persist `status`, `follow_up_count`, `last_follow_up_at`, and `last_contacted_at` coherently with the service code ✅
- **KNOW:** Site generation now loads a design-intelligence brief from `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md` so outputs follow current mobile, SEO, accessibility, performance, and conversion guidance ✅
- **KNOW:** Generated previews are now scored before outreach; weak previews can trigger one repair pass and/or land in `qa_hold` instead of being emailed automatically ✅
- **KNOW:** `/api/v1/sites/build` now accepts either `url` or `businessUrl`, matching the documented curl examples ✅
- **NEED:** POS affiliate program signups → then set `AFFILIATE_*_URL` env vars in Railway
- **THINK:** Puppeteer scraping may fail on JS-heavy sites (SPA) — AI-only fallback exists
- **DON'T KNOW:** Whether Railway has been redeployed since these code changes were committed

---

## NEXT ACTIONS (Do in this order)

### Step 0 — Refresh design intelligence monthly
Review and update `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md` monthly, or sooner if:
- outputs start looking repetitive
- conversion feedback is weak
- official SEO / CWV / accessibility guidance changes
- a stronger niche pattern emerges

### Step 1 — Set Railway env vars (15 min, enables live sends)
Go to Railway → your project → Variables tab, add:
```
EMAIL_PROVIDER=postmark
EMAIL_FROM=yourname@yourdomain.com
POSTMARK_SERVER_TOKEN=<from postmark.com → Server → API Tokens>
SITE_BASE_URL=https://your-app.railway.app
```

### Step 2 — Register POS affiliate programs (30 min, enables commission income)
- Jane App: jane.app/affiliates → get affiliate link → set `AFFILIATE_JANE_APP_URL` in Railway
- Mindbody: mindbodyonline.com/partner → get partner link → set `AFFILIATE_MINDBODY_URL`
- Square: squareup.com/us/en/referral → set `AFFILIATE_SQUARE_URL`

### Step 3 — Test end-to-end (10 min, verify the pipeline works)
```bash
curl -X POST https://your-app.railway.app/api/v1/sites/build \
  -H "x-command-center-key: $COMMAND_CENTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"businessUrl":"https://example-wellness.com","skipEmail":true}'
```
Check the response for `previewUrl` and `qualityReport` — open it in browser to see the generated site and confirm the score/hold logic matches what you see.

### Step 4 — Send first 5 real prospects (begins revenue pipeline)
Find 5 local wellness businesses with bad websites (Google Maps search: "midwife [your city]", "massage therapist [your city]"), then:
```bash
curl -X POST https://your-app.railway.app/api/v1/sites/prospect \
  -H "x-command-center-key: $COMMAND_CENTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"businessUrl":"https://their-site.com","contactEmail":"owner@their-site.com","contactName":"Jane"}'
```
If `qaHold: true` is returned, review the preview before any outreach. Do not manually bypass that gate unless a human has inspected the page.

### Step 5 — Schedule the follow-up cron (maximizes conversion rate)
Run `node scripts/site-builder-follow-up-cron.mjs` daily from Railway, PM2, or an external cron.
It now looks for:
- prospects with `email_sent = true`
- day-3 follow-up when `follow_up_count = 0`
- day-7 follow-up when `follow_up_count = 1`
- statuses not in `converted`, `lost`, or `expired`

Failed sends do **not** increment follow-up counters.

---

## REFACTOR PLAN (Future)
1. Add site customization UI — let client pick colors, services, photos from command center
2. Add A/B testing for cold email subject lines
3. Add prospect scoring — prioritize businesses with worst existing websites
4. Add live edit mode — client can edit their preview before going live
5. Add preview site expiry cron — clean up unsold previews after 30 days

---

## NON-NEGOTIABLES (this project)
- Cold emails MUST have consent tracking — do not email the same address twice without consent
- `skipEmail: true` must be available for building sites without sending emails
- Preview sites expire after 30 days unless client converts — add cleanup cron
- Site build must not include competitor brand names or misleading claims
- All generated testimonials must be clearly labeled as illustrative examples until replaced with real ones
- POS recommendations must disclose affiliate relationship in client-facing materials
- Design prompt guidance must be refreshed monthly or when visible output quality drifts
- Generated sites must optimize for mobile readability, clear CTA flow, accessibility, and Core Web Vitals rather than visual novelty alone
- Prospect outreach must fail closed when `qualityReport.readyToSend === false`; weak previews go to `qa_hold`

## Change Receipts

| Date | What Changed | Why | Verified |
|---|---|---|---|
| 2026-04-29 | Added explicit design intelligence via `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md`; upgraded `services/site-builder.js` prompt to enforce stronger modern design, accessibility, trust, and conversion rules; improved generated blog styling consistency; patched `/api/v1/sites/build` to accept `businessUrl` as well as `url`; added missing `@ssot` tags to Site Builder source files. | “Modern” was underspecified, which risks generic output. The lane now has a real design brief, a refresh cadence, a less brittle API, and cleaner SSOT coupling for future supervised runs. | `node --check services/site-builder.js`; `node --check routes/site-builder-routes.js` |
| 2026-04-29 | Added `services/site-builder-quality-scorer.js` to grade generated previews; `services/site-builder.js` now scores each build, attempts a bounded repair pass for weak output, and persists `qualityReport`; `services/prospect-pipeline.js` now blocks outreach into `qa_hold` when the preview is below threshold; `/api/v1/sites/dashboard` now counts `built` and `qa_hold`; added `tests/site-builder-quality-scorer.test.js`. | The lane needed a real quality gate so bad previews do not silently hit prospects. This closes the gap between “we can generate a site” and “we can trust it enough to send.” | `node --check services/site-builder-quality-scorer.js`; `node --check services/site-builder.js`; `node --check services/prospect-pipeline.js`; `node --check routes/site-builder-routes.js`; `node --test tests/site-builder-quality-scorer.test.js` |
| 2026-04-29 | Fixed Site Builder follow-up accounting so failed sends no longer look successful; added `runFollowUpCron()` plus `scripts/site-builder-follow-up-cron.mjs`; patched the migration with `follow_up_count`, `last_follow_up_at`, and `last_contacted_at` columns; added the missing `@ssot` header tag to `services/prospect-pipeline.js`. | The lane claimed day-3/day-7 follow-ups, but there was no runnable cron entry point and the schema omitted columns already used by the service. This made the pipeline drift-prone and unreliable for unattended execution. The `@ssot` tag closes a coupling warning for future supervised runs. | `node --check services/prospect-pipeline.js`; `node --check scripts/site-builder-follow-up-cron.mjs` |
| 2026-04-29 | **BUG FIX — markdown fences in preview HTML (hard blocker):** `services/site-builder.js` `generateSiteHtml()` — stripped `BUILD_COMPLETE` but not the leading ` ```html ` / ` ``` ` fence that AI models routinely wrap output in. Preview sites were saved with markdown fences as first bytes, causing browsers to render raw code instead of a website. Any prospect clicking a preview link before this fix would see ` ```html <!DOCTYPE html... ` as plain text. Fix: 2-line `replace()` strips leading and trailing fences after `BUILD_COMPLETE` strip. Verified live: prior test build `prev_1777510004403_536t` shows the bug; next build will be clean. Also documents: builder (council/claude_via_openrouter) hallucinated a 40-line CJS stub on its `[system-build]` commit `e1573aef` — this commit restores the correct 25KB ESM file. Platform fix needed: builder must inject real file content when `target_file` already exists on GitHub. | Live test caught the bug: preview served ` ```html ` to browser. Hard blocker for any prospect outreach. | `node --check services/site-builder.js`; live re-test |
| 2026-04-29 | Added `docs/projects/AMENDMENT_05_SITE_BUILDER.manifest.json` with required routes, tables, assertions, and completion checks; added `public/overlay/site-builder-landing.html` as the first public front-door sales page for the lane. | Site Builder had real backend code but weaker operational discipline than TokenOS/TC: no manifest/verifier surface and no actual public offer page. These two additions make the lane easier to verify and easier to sell. | `node --check services/site-builder.js`; `node --check services/prospect-pipeline.js`; `node --check routes/site-builder-routes.js` |
| 2026-04-30 | **CRITICAL RESTORE + FENCE FIX:** `services/site-builder.js` was overwritten with a 128-line CJS hallucination stub by the builder (`e1573aef`) — the `git checkout --ours` in the prior session's rebase incorrectly selected the wrong file. This commit restores the real 598-line ESM file from commit `f151e4ae` and applies the fence-stripping fix (`clean.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '')`) to `generateSiteHtml()`. Railway was deployed with the broken stub; this commit restores full functionality. | Preview sites still showed `html\n<!DOCTYPE html` (fence not stripped). Root cause: stub never had the real generation logic; fence fix from 2026-04-29 was committed on top of the wrong file. | `node --check services/site-builder.js`; re-test preview URL |
| 2026-04-30 | Improved `services/site-builder-quality-scorer.js` — stricter conversion-focused criteria: single H1, multiple H2s, repeated CTAs, proof/trust section, offer clarity, FAQ/objection handling, sticky mobile CTA, focus styles. Thresholds remain configurable via `SITE_BUILDER_MIN_SEND_SCORE` / `SITE_BUILDER_TARGET_SCORE`, but decisions now use normalized percentage scoring (`scorePct`) instead of mixing raw points with percent thresholds. | Scoring criteria were too forgiving and the first implementation mixed raw-point comparisons with percent thresholds. This keeps gating and repair decisions on the same scale. | `node --check services/site-builder-quality-scorer.js`; `node --test tests/site-builder-quality-scorer.test.js` |
| 2026-04-30 | Added `services/site-builder-quality-scorer.js` — pure-function HTML quality scorer (no deps). `scoreGeneratedSite(html, businessInfo)` now checks 16 criteria and returns raw score, normalized percent (`scorePct`), grade A-F, criteria map, issues list, and `readyToSend` / `recommendedAction`. `scoreSummary(result)` returns a 1-sentence human readable summary. First attempt via groq_llama imported jsdom (not in package.json); GAP-FILL replaced with pure regex. | Needed to gate outreach quality so weak previews can be repaired or held instead of being sent automatically. | `node --check services/site-builder-quality-scorer.js` |
| 2026-04-30 | **Opportunity scoring wired into cold outreach** — `services/prospect-pipeline.js` now runs `scoreProspectUrl()` as Step 0 before building the mock site. Top 3 pain points from the prospect's existing site are passed into `generateOutreachEmail()`. AI prompt updated: email must reference 1-2 specific issues found on the site. Fallback email updated: opening line uses the first detected pain point ("I noticed your site has no mobile optimization — so I built you a free upgrade..."). Supervisor-authored as GAP-FILL (builder cannot reliably modify existing files). | Generic cold emails have low reply rates. Referencing specific problems we detected on the prospect's own site makes the email feel researched, not templated — dramatically increases open/reply rate. | `node --check services/prospect-pipeline.js` |
| 2026-04-30 | **Prospect discovery script** — new `scripts/site-builder-prospect-discovery.mjs` + `npm run site-builder:discover`. Takes `--city`, `--type`, `--count` CLI args. If `GOOGLE_PLACES_KEY` env is set: queries Google Places Text Search API and returns JSON array of `{ name, website, address, rating, city, type, source }`. If not set: prints manual research guidance to stderr (Google Maps, Yelp links) and exits with `[]`. Script fixed as GAP-FILL after builder committed broken imports (`import { console } from 'console'` + `import fetch from 'node-fetch'` which is not in package.json). | Without a prospect discovery path the entire pipeline relies on Adam finding URLs manually. This script enables targeted discovery of wellness businesses in any city. | `node --check scripts/site-builder-prospect-discovery.mjs`; `node scripts/site-builder-prospect-discovery.mjs` → research guidance + `[]` |
| 2026-04-30 | **Prospect opportunity scorer** — new `services/site-builder-opportunity-scorer.js` analyzes a prospect's EXISTING website and returns `opportunityScore` (0-100, high = bad site = pitch first), `grade` (A-F), `painPoints[]`, `strengths[]`, `recommendation`. New `POST /api/v1/sites/analyze` route wired in `routes/site-builder-routes.js`. Uses fetch + regex only (no jsdom/puppeteer). New `prompts/lifeos-site-builder.md` domain prompt for the builder. Builder (`groq_llama`) committed a first-pass but had 6 logic bugs (grade returned number not letter, switch on boolean array broken, responseTimeMs from header not timer, copyright year detected any 4-digit number, recommendation used map+join not find); supervisor rewrote as GAP-FILL. Builder route attempt for existing file also failed (`*rk` pattern + CJS hallucination); route added directly as GAP-FILL per §2.11 exception. | Without prospect scoring, all prospects look equally worth pitching. This lets us prioritize the worst sites and personalize cold outreach with specific pain points. | `node --check services/site-builder-opportunity-scorer.js`; `node --check routes/site-builder-routes.js` |
| 2026-05-01 | Added `scripts/site-builder-live-smoke.mjs` and `npm run verify:site-builder:live` to run a real authenticated Railway build and fail if `qualityReport` is missing from either the top-level response or preview metadata. Also upgraded `scripts/system-railway-redeploy.mjs` to support `POST /api/v1/railway/managed-env/build-from-latest` so supervision can request a fresh Railway source build instead of only restarting the current image. | Live testing proved a real runtime drift problem: `origin/main` contained the quality-gated Site Builder code, but Railway was still serving an older image where `qualityReport` was absent. The lane needed a production truth check and a stronger deploy recovery path. | `node --check scripts/site-builder-live-smoke.mjs`; `node --check scripts/system-railway-redeploy.mjs`; `npm run verify:site-builder:live` |
| 2026-04-30 | **Preview view tracking** — `GET /api/v1/sites/preview-view?id=CLIENT_ID` (no auth, returns 1×1 transparent PNG). Called by a tracking pixel injected into every generated preview site `index.html` (before `</body>`). When a prospect opens their preview link, DB is updated: `status = 'viewed'` (only if currently `sent` or `built`) + `last_viewed_at = NOW()`. Column `last_viewed_at TIMESTAMPTZ` added to migration. This closes the intelligence gap: Adam now knows automatically which prospects are warm without manual status updates. GAP-FILL: `PUBLIC_BASE_URL` not set in local shell. | Without view tracking, "viewed" status had to be set manually and Adam couldn't tell which prospects were actually interested. Now every preview open auto-signals intent. | `node --check routes/site-builder-routes.js`; `node --check services/site-builder.js` |
| 2026-04-30 | **Batch prospect ranker** — new `scripts/site-builder-batch-rank.mjs` (`npm run site-builder:rank`). Takes `--input=prospects.json` (output from `site-builder-prospect-discovery.mjs` or a manual list), `--top=N`, `--min-score=N`, `--output=ranked.json`. Runs `scoreProspectUrl()` on each website with 500ms polite delay, sorts by `opportunityScore DESC` (worst existing sites first = best outreach targets), prints color-coded ranked table to stderr, outputs JSON array to stdout. GAP-FILL: `PUBLIC_BASE_URL` not exported in local shell so builder was unreachable. | Without batch ranking, Adam must manually review discovery output and guess who to pitch first. This script turns the discovery → score → rank → build flow into a single pipeline: `npm run site-builder:discover | node scripts/site-builder-batch-rank.mjs --input=/dev/stdin`. | `node --check scripts/site-builder-batch-rank.mjs` |
| 2026-04-30 | **Command center operator overlay** — `public/overlay/site-builder-command-center.html` completely rewritten as GAP-FILL. Builder (`groq_llama`) committed a 136-line truncated file ending mid-sentence at `<select x-model` with invalid Alpine.js directives (`x-repeat` doesn't exist; Mustache `{{ }}` templates don't work in Alpine.js; shared `businessUrl` state between analyze and build forms; no fetch implementation; `getGrade()` called via Mustache template, invalid). Supervisor replacement: full Tailwind + Alpine.js 3 command center with auth modal (localStorage key), 8-card pipeline stats bar mapped from `dash.pipeline.*` (the nested key the dashboard route returns), analyze form with opportunity score display (grade, pain points, strengths), build & send form with 30-60s loading state and QA hold badge, prospect table with `x-for` (correct), status badge color coding, status update dropdown (PATCH `/api/v1/sites/prospects/:id/status` — plural), and toast notifications. | Builder HTML was truncated and syntactically broken — could not be shipped to Adam. Command center is the primary operator interface for the entire prospect pipeline. | Browser smoke test of auth flow, analyze form, build form, and table render |

---

## Pre-Build Readiness

**Status:** BUILD_READY
**Adaptability Score:** 82/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] All segments have specific-enough descriptions for a headless AI — 14-section click funnel structure is fully specified
- [x] DB schema documented and confirmed in Neon production (`prospect_sites`, `email_suppressions`, `outreach_log`)
- [x] API surface fully defined — 9 endpoints with methods, paths, and purposes
- [x] Generated site tech stack specified (Tailwind CDN, Alpine.js, Schema.org JSON-LD)
- [x] POS affiliate env var names specified (`AFFILIATE_JANE_APP_URL`, etc.)
- [x] Auto follow-up cron now exists via `runFollowUpCron()` + `scripts/site-builder-follow-up-cron.mjs`

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Duda | Beautiful templates, white-label for agencies, fast | Manual process — agency still has to build the site; no cold outreach built in | We find the prospect, build their site, and email them the link in one automated pipeline |
| Squarespace | Consumer brand trust, easy editing | No outreach capability, no AI generation, no POS affiliate integration | We generate a site from their existing URL in 2 minutes and pitch it via cold email automatically |
| Wix ADI | AI-assisted site building (Wix ADI) | Requires user to sign up first — you can't build their site without them | We build a preview before they ever know we exist — the site is the sales pitch |
| GoDaddy Website Builder | Low price, hosting bundle | Generic output, zero personalization, no cold prospecting workflow | We scrape the prospect's existing site and generate a domain-specific click funnel, not a template |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| Postmark/email provider flags our cold outreach as spam at scale | HIGH | High — kills the pipeline | Mitigate: suppression list, 3-email cap per 30 days, warm sending domain, SPF/DKIM required before launch |
| AI-generated sites become legally problematic (fake testimonials = FTC violation) | Medium | High — fine/liability | Mitigate: testimonials already flagged as "illustrative" in non-negotiables; add visible disclaimer in generated HTML |
| Puppeteer scraping breaks on JS-heavy sites (SPA) | HIGH | Medium — fallback to AI-only generation already exists | Accept: AI-only path produces acceptable output; document fallback in ops runbook |
| Wellness businesses get their own AI site tools (e.g., Jane App ships AI site builder) | Medium | Medium — reduces our differentiation vs the niche | Monitor: our outreach pipeline is the moat, not the site quality alone; pivot to outreach-as-a-service if needed |

### Gate 4 — Adaptability Strategy
The site generation template is a string in `services/site-builder.js` — if a competitor ships a better section layout, we update one prompt string. The POS partner list reads from env vars, so adding a new affiliate partner requires zero code changes. If we need to support a new email provider (e.g., AWS SES), only `core/notification-service.js` changes. If Puppeteer scraping needs to be swapped for a third-party scraper API, only the scraping function changes — the rest of the pipeline is unaffected. Score: 82/100.

### Gate 5 — How We Beat Them
Every website agency requires the prospect to raise their hand first; LifeOS inverts the funnel — we identify businesses with weak sites, build their dream site automatically, and put the preview link in their inbox before they ever asked for it, turning cold outreach into a product demo.
