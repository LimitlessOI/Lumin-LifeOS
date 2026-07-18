<!-- SYNOPSIS: Canonical product home — Site Builder -->

# Site Builder Product Home

**Formerly called:** Amendment 05 — SITE BUILDER

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `site-builder` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/site-builder/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-07-10 — Preview persistence: previews dir is now resolved via `config/site-builder-paths.js` (`SITE_PREVIEWS_DIR` / `RAILWAY_VOLUME_MOUNT_PATH` → persistent volume, else `public/previews`); async prospect jobs now time out and stale `building` rows are reconciled on boot. Corrected stale env-var "hard blocker" (those vars are set in Railway per `docs/ENV_LIVE_INVENTORY.json`). |

---

## Product operations (preserved from prior home)

## Mission

Done-for-you website builder for wellness/health businesses. Scrapes a prospect's existing website, uses AI to build a modern click-funnel site with SEO, automated blog content, YouTube video integration, and a booking/POS system. Sends a cold email with a link to their free preview site to sell them the upgrade.

**Mission statement:** Find businesses with bad websites → build their dream site in 2 minutes → email them the link → close the deal.

## Readiness state

`PARTIAL_CODE_PRESENT` — **NOT sellable via the autonomous funnel until the P0s below close.**

Code is deployed and the previously-cited email/Stripe env vars ARE set in Railway (`docs/ENV_LIVE_INVENTORY.json`, 2026-07-10) — the old "4 missing env vars" hard blocker is **stale/false**. Real blockers to taking money (audit 2026-07-10):

**P0 — preview persistence (fix landed in code; needs a Railway volume attached).** Previews wrote to the ephemeral container FS (`public/previews`); every redeploy wiped them → emailed links + checkout 404. Now the previews dir is resolved by `config/site-builder-paths.js`: set `SITE_PREVIEWS_DIR`, or attach a Railway volume (auto-sets `RAILWAY_VOLUME_MOUNT_PATH` → `<mount>/previews`), else it falls back to `public/previews` (dev only). **Action needed: attach a persistent volume to the app service in Railway production.**

**P0 — async build hang (fixed in code).** Prospect jobs could stick at `building` forever (hung build, or redeploy mid-build orphaning the DB row). `services/site-builder-prospect-runner.js` now caps each job with `PROSPECT_JOB_TIMEOUT_MS` (default 4m) and `reconcileStuckProspectJobs()` marks orphaned `building` rows (> `PROSPECT_JOB_STALE_MS`, default 15m) as `failed` on boot.

**P0 — no proven end-to-end Stripe sale.** `$0` revenue; the `$49 → checkout → success → converted` path has never run with a real card against a persisted preview.

**P1 — no green SENTRY Layer A+B receipt** against a persisted preview; **post-$49 delivery undefined** (success page says "we'll handle domain setup next").

- (Optional) `AFFILIATE_JANE_APP_URL`, `AFFILIATE_MINDBODY_URL`, `AFFILIATE_SQUARE_URL`
- (Needed for therapist discovery) `GOOGLE_PLACES_KEY` — absent per inventory.

## Owned runtime files

Defined in full at `docs/products/site-builder/FILE_MANIFEST.json`.

Routes:
- `routes/site-builder-routes.js` — build, prospect, bulk-prospect, CRM, dashboard
- `routes/site-builder-discovery-routes.js`
- `routes/site-builder-launch-readiness-routes.js`
- `routes/site-builder-pipeline-report-routes.js`

Services:
- `services/site-builder.js` — core: scrape → AI generate → deploy
- `services/competitor-benchmark.js` — scrape competitor/best-in-industry sites, score each 1-10 with strengths/weaknesses, synthesize design brief fed into generation
- `services/presence-audit.js` — score the business AND competitors across website/GBP/Instagram/Facebook/LinkedIn; produce a head-to-head gap/opportunity readout
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

## Shared dependencies

| System | Owner | Pointer |
|--------|-------|---------|
| AI Council (site generation) | Platform | `docs/products/ai-council/PRODUCT_HOME.md` |
| Email / Postmark | Platform | `core/notification-service.js` |
| Command Center operator UI | Platform | `docs/products/command-center/PRODUCT_HOME.md` |
| BuilderOS queue | Machine | `builderos-reboot/BP_PRIORITY.json` |

## Conversations

All Site Builder conversations, brainstorms, and session dumps live at:  
`docs/products/site-builder/conversations/YYYY-MM-DD-topic.md`

---
**Status:** QUALITY-GATED LAUNCH READY — awaiting Railway env vars + live preview verification
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-06-25 — `core/two-tier-system-init.js` — added `createBlueprintIntakeRoutes` import and registration call. Prior: 2026-05-12 — **RL1 repair loop** — `services/site-builder-postmark-helper.js` + **`npm run operator:repair-loop`** (`scripts/operator-repair-loop-once.mjs`) + `tests/site-builder-postmark-helper.test.js` ( **`node:path`** import — verify gate); quarantine clear for **`site-builder-postmark-send`**. Prior: 2026-05-11 — Emergency restore: createSiteBuilderRoutes factory removed by autonomous builder; server crash fix: `patchSiteHtml()` deterministic injection, maxOutputTokens 800→14k, gemini_flash for generation (replaces chatgpt→groq_llama alias that was capping output at 800 tokens), repair passes 1→2, focus-styles regex fixed. Site quality benchmark: 35.6%/F → 88.5%/B after patch. Full automation loop now wired: prospect discovery → batch ranking by opportunity score → mock site build → email outreach → view tracking (auto, via pixel) → reply detection (auto, via Postmark webhook) → follow-up cron → pipeline report. New in this session: command center overlay (operator UI), batch ranker script, pipeline analytics report, preview view tracking pixel, Postmark reply webhook, opportunity scorer accuracy upgrade (30+ booking platforms, chain/franchise cap). All 31/33 verifier checks pass; only 2 remaining failures are `SITE_BASE_URL` + `EMAIL_FROM` env vars (Adam sets in Railway to activate email sending).
**Last Updated:** 2026-06-30 — `core/two-tier-system-init.js` now honors the founder-builder runtime profile and suppresses auxiliary expansion services outside explicit `full` runtime mode, which keeps the site-builder lane from piggybacking on founder/builder alpha boot unless intentionally re-enabled.
**Last Updated:** 2026-07-05 — **Design v1: competitor benchmarking + client-facing scorecard + hero SVG fix.** (1) `sanitizeInlineSvgBackgrounds()` in `services/site-builder.js` percent-encodes malformed inline-SVG data-URI backgrounds so backslash-escaped quotes no longer break the style attribute and leak `');">` as visible hero text (root cause of the "meh" glitch on WellRoundedMamma test). (2) New `services/competitor-benchmark.js`: `benchmark({businessInfo,competitorUrls})` does a lightweight fetch-scrape of each competitor, AI-scores each **1-10** with concrete `doesWell[]`/`doesPoorly[]`, and synthesizes a `designBrief` (adopt winning patterns, beat common weaknesses) that is injected into the generation prompt so sites are built against the real market, not a generic template. (3) `generateScorecardHtml()` renders a branded, XSS-safe client-facing scorecard page written to `previews/<id>/scorecard.html` — the trust-builder Adam asked for ("show them what competitors do well/poorly, get them invested"). (4) New route `POST /api/v1/sites/competitor-scorecard` (standalone) + `competitorUrls` accepted on `/build`. Rationale (Adam): "look at what competitors' and best-in-industry sites look like… score every competitor 1-10… the more we get them invested, the more trust, the more they pay." Verify: `node -c` all touched files + benchmark/scorecard smoke tests (signals, scoring, brief synthesis, XSS escaping) PASS. Next: aesthetic-quality scorer dimension, real imagery pipeline, free spec logo, real-time interactive editor.

**Last Updated:** 2026-07-05 — **Design v1.1: head-to-head presence audit.** New `services/presence-audit.js`: `compare({businessInfo,competitorUrls})` scores the business AND each competitor across **five channels** — website, Google Business Profile, Instagram, Facebook, LinkedIn — by discovering social/GBP links on each homepage, fetching what is publicly readable, and AI-scoring each channel **1-10** (`doesWell`/`doesPoorly`/`recommendation`). It then builds a per-channel `perChannel` comparison (client score vs competitor average → `ahead`/`behind`/`even`/`open_lane`) and an AI `gap` readout (summary + biggest opportunity + quick wins). Honesty guard: login-walled/JS-shell social pages are reported `analyzable:false` with a presence note — we never fabricate a 1-10 we could not measure. Wired into `site-builder.js` (`auditPresence()` + run inside `buildFromUrl` when `competitorUrls` present; result added to metadata + build response), rendered into the client-facing `scorecard.html` via `generatePresenceSectionHtml()` (you-vs-competitors table + gap readout), and exposed standalone at `POST /api/v1/sites/presence-report`. Refactored `competitor-benchmark.js` to share a `fetchRaw()` helper. Rationale (Adam): "score where the business is on all their pages, and do the same for their competitors — if they're all ahead they should know it, if they're all behind that's opportunity." Verify: `node --check` all touched files + presence logic smoke test (link extraction, per-channel verdicts incl. `open_lane`, scorecard render) PASS. Next: harvest real social images/reviews into the site, GBP management + daily-blog offering, à-la-carte value ladder.

**Last Updated:** 2026-07-06 — **Live preview EDITOR queued for autonomous build.** Founder direction (2026-07-06 session, captured in `FOUNDER_NOTES.md`): the preview needs (1) a visible **template switcher**, (2) an **AI chat + microphone** box where the client speaks/types a change in plain language and the system rewrites the site and reloads — "they give directions, it gets done", (3) **manual controls** (reorder sections, click-to-edit text, hide/show) available alongside the AI box (both, not either/or), (4) a **color-palette toggle** with palettes derived from the current site + competitors + wellness color theory, (5) a **Strategy tab** surfacing the existing 1-10 competitor scorecard + a plain-English synopsis, and making the AI editor competitor-aware, (6) **dual-category competitor benchmark** — Sherry is BOTH a midwife AND a wellness practitioner, so always compare against home-birth/midwifery AND wellness sites, and (7) **active social/YouTube discovery** — find her channel even when unlinked and embed real videos (not a "coming soon" placeholder). Founder also defined the editor as a **3-pane workspace** (left = à-la-carte service sidebar, center = live website that edits on click or by voice in real time, right = chat), with the sidebar being the revenue ladder (logo/brand kit, corporate package, ClickFunnels + ad management, managed Google Business Profile + local SEO, social-media management, content care plan) — honest copy only (no "guaranteed #1"), competitor-aware so the right upsell surfaces first. These were expanded into single-file, gate-safe steps in `BUILD_QUEUE.json` (`sb-editor-shell`, `sb-editor-endpoints`, `sb-competitor-categories`, `sb-social-discovery`, `sb-service-catalog`) for the never-stop loop to build one at a time with real commit proof. The founder-gated `sb-customization-ui` step is now unblocked by this direction. Devin's role this session: oversee the loop building these, verify each commit, self-repair on failure — not hand-code.

---

## WHAT THIS IS
Done-for-you website builder for wellness/health businesses. Scrapes a prospect's existing website, uses AI to build them a modern click-funnel site with SEO, automated blog content, YouTube video integration, and a booking/POS system. Then sends them a cold email with a link to their free preview site to sell them the upgrade.

**Mission:** Find businesses with bad websites → build their dream site in 2 minutes → email them the link → close the deal.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| **Entry publish (front door)** | **$49 one-time** (env: `SITE_BUILDER_PUBLISH_CENTS`) | Free preview → low-friction checkout → second sales |
| Monthly care plan (site + SEO + content) | **$97/mo** entry → scale to $297–$597/mo | Recurring MRR after publish |
| À-la-carte sidebar upsells | $97–$1,497 + management | Logo, GBP/SEO, ads/funnels, social — competitor-aware |
| Legacy closer tiers | $997–$1,997 one-time | Upsell after entry publish — not cold-email front door |
| POS referral commission | $50–$2,500 | Per signup via our affiliate link |
| **Target:** | Usage first, MRR second | Foot-in-door beats one-shot $997 until funnel proves |

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
| `services/site-builder-postmark-helper.js` | Standalone Postmark send for prospect outreach (`sendProspectOutreach`) — GAP-FILL when builder truncated queue task **`site-builder-postmark-send`**; **`npm run operator:repair-loop`** clears quarantine + **`quarantine-cleared-tasks`** exemption |
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
- Preview dir resolved by `config/site-builder-paths.js` (`SITE_PREVIEWS_DIR` / `RAILWAY_VOLUME_MOUNT_PATH`+`/previews` / `public/previews`).
- Preview sites: `{previewsDir}/{clientId}/index.html`
- Served at: `{SITE_BASE_URL}/previews/{clientId}/` (static mount points at the resolved dir)
- Blog posts: `{previewsDir}/{clientId}/blog/{slug}/index.html`
- SEO: `{previewsDir}/{clientId}/sitemap.xml` + `robots.txt`

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
| POST | `/api/v1/sites/email-reply-webhook` | Postmark inbound — auto-marks replied prospects |
| GET | `/api/v1/sites/preview-view` | Tracking pixel — auto-marks viewed prospects |

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
- **KNOW:** Manifest/verifier file now exists for this lane: `docs/products/site-builder/FILE_MANIFEST.json` ✅
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
| 2026-07-10 | **Preview persistence + async-build resiliency (P0 fixes).** New `config/site-builder-paths.js#resolvePreviewsDir()` is the single source of truth for the previews dir (`SITE_PREVIEWS_DIR` → `RAILWAY_VOLUME_MOUNT_PATH`+`/previews` → `public/previews`); repointed `services/site-builder.js` (absolute `previewsRoot`), `routes/site-builder-routes.js` (SiteBuilder init, `/previews` static mount, logo-studio meta), `routes/site-builder-checkout-routes.js` (`loadPreviewMeta`), `routes/site-builder-editor-routes.js` + `routes/site-builder-prealpha-routes.js` (`PREVIEWS_ROOT`), `services/preview-expiry-cron.js` + expiry/quality scripts. `services/site-builder-prospect-runner.js`: `withTimeout()` caps builds (`PROSPECT_JOB_TIMEOUT_MS`, default 4m) and `reconcileStuckProspectJobs()` fails orphaned `building` rows on boot (called from `createSiteBuilderRoutes`). Also corrected the stale "4 missing env vars" readiness claim. | Audit 2026-07-10: previews wiped on every redeploy (ephemeral FS, no volume) → emailed links + checkout 404; 4 prospects stuck `building` 2h+. Backward-compatible: no behavior change until a volume/`SITE_PREVIEWS_DIR` is present. | `node --check` all touched files PASS. **Not yet verified in prod** — needs a Railway volume attached to the app service + one build re-run + SENTRY Layer A/B against a persisted preview. |
| 2026-07-08 | **`services/stripe-client.js` tracked** — checkout imports Stripe via dedicated helper; closes ERR_MODULE_NOT_FOUND class for publish checkout on Railway. | Wave 0 import-smoke caught untracked import from `site-builder-entry-checkout.js`. | ✅ spine import verify PASS |
| 2026-07-08 | **Self-fix wiring: gate runner now pipes both layers' results through `services/sentry-findings-to-improvement-feed.js` (system-authored via governed builder, commit `e66621ba6`) and writes `products/receipts/SENTRY_FINDINGS_FEED.json`.** Each SENTRY finding is normalized to `{ code, detail, proposed_solution, severity, source }` (solution-mandatory: never empty — synthesizes the smallest next step) and to the `{ blockers, warnings }` shape `services/builderos-improvement-loop.js` already consumes — so a failed/"rough" gate automatically produces governed improvement proposals. No secondary queue. | SO-002 solution-mandatory amendment (#286) + founder: "get the system to do your job, fix itself." Closes flag→propose→build→re-verify without a human. | Module `node --check` + PROVEN on the real Layer B result for `onlinewellroundedmama.com`: 4 findings, **0 without a solution**, correct improvement-loop shape, guards `null`/`{}`. Gate runner `node --check` + ran live (feed emits; 0 findings when no preview exists — fail-safe). |
| 2026-07-08 | **`scripts/sentry-site-builder-prealpha-gate.mjs` + `npm run sentry:site-builder:gate` + `BUILD_QUEUE.json` `verify_script` — wire the two-layer gate into the completion check.** The Site Builder queue's `verify_script` now points at the combined SENTRY gate: it runs **Layer A** (structural, always) and **Layer B** (human-sim real browser + UX critique, whenever `PUBLIC_BASE_URL`+`COMMAND_CENTER_KEY` are present — i.e. on prod) and **fails closed**. In local/CI (no prod creds) Layer B is loudly deferred, never faked. So the autonomous never-stop factory's `verifyFn` (which runs the queue `verify_script`) now enforces SO-002: no Site Builder step is marked "done" until SENTRY passes as a real client. Prior lane check still available via `npm run verify:site-builder`. | Founder doctrine SO-002: the gate must actually gate completion, not just exist. This makes "no feature done until both layers pass" true inside the build loop, not just by hand. | `node --check`; ran live vs prod — gate executes both layers and **fails closed** when no preview exists (previews were wiped by a redeploy — the tracked ephemeral-storage issue), proving fail-closed behavior. Layer A (6/7 incl. parked-guard) and Layer B (7/7 + UX critique) each proven live separately. |
| 2026-07-03 | **`routes/site-builder-prealpha-routes.js` (B02b) + `scripts/run-site-builder-prealpha.mjs` (A05b) — content-truth guard: fail the gate when the built site was scraped from a parked/for-sale/placeholder domain** (markers: `hugedomains`, `godaddy`, "is for sale", "buy this domain", "just a moment"/"checking your browser" Cloudflare challenge, `sedo`, `namecheap`). A parked domain yields a garbage site with no real logo/content to preserve, so it must not be called "done." | Live Layer B on `wellroundedmama.com` rendered a "HugeDomains — Your Perfect Domain Name" page; the domain is a Cloudflare-gated HugeDomains parking page (HTTP 403). The gate passed structurally but the *content* was wrong — exactly the "doesn't line up on the back end" failure the founder wants caught. | Ran Layer A live vs prod on the parked build: **A05b FAILs** with `PARKED/PLACEHOLDER content detected ("HugeDomains")`; overall gate FAIL (6/7). `node --check` both files. |
| 2026-07-03 | **`routes/site-builder-prealpha-routes.js` + `config/auto-registered-product-modules.json` — SENTRY pre-alpha Layer B (human-sim). Mounts `POST /api/v1/sites/prealpha/layer-b`.** Drives the live editor with a real (prod) browser the way a client would and fails closed: (B01) editor shell loads, (B02) the canvas iframe shows the **REAL site** — non-empty body, `src` absolute, no "Cannot GET"/404 markers, (B03) switching a template chip reloads the canvas, (B04) the AI chat accepts typed input + send, (B05) clicking Save with no edits doesn't crash the editor, (B06) the publish path is discoverable and points at checkout. Captures screenshots into `/previews/<clientId>/_sentry/` (web-viewable) and asks a **cheap model (`gemini_flash`)** for a client's-eye UX critique (`verdict` + `friction_points` + `improvements`), so the gate judges the *experience*, not just "it renders." Auto-registered into the founder lane (runs on prod where Chrome launches). | Founder doctrine (verbatim): a feature is done only when the system does "a real walkthrough like you're a human being … look at it from the client's perspective … if a button's in a stupid place or it's requiring us to do a step that maybe is unneeded, it should be thinking of ways to make it a better experience." Layer A (HTTP) alone can't judge UX. | `node --check`; selectors verified against `services/site-builder-editor-canvas.js` (`data-lifeos-iframe`/`-template-file`/`-save`). Live prod walkthrough result recorded on the PR. |
| 2026-07-03 | **`scripts/run-site-builder-prealpha.mjs` + `npm run sentry:site-builder:layer-a` — SENTRY pre-alpha Layer A (structural walkthrough).** Acts as a client's browser at the HTTP level and fails closed: (A01) a preview with an edit token exists, (A02) preview page loads 200 + real HTML, (A03) editor loads 200 with the canvas iframe, (A04) the iframe `src` is **absolute + points at `/previews/`** (catches the relative-path regression), (A05) following the iframe `src` returns the real site 200 (catches the "Cannot GET" 404), (A06) publish resolves 302 → `checkout.stripe.com`. Writes `products/receipts/SITE_BUILDER_PREALPHA_LAYER_A.json`. Reuses the newest preview via `GET /api/v1/sites/previews` (or `PREVIEW_CLIENT_ID`/`PREVIEW_EDIT_TOKEN`) — no rebuild cost per run. Layer B (human-sim browser + UX critique) is the second half of the doctrine. | Founder doctrine: no feature is "done" until SENTRY walks it like a client and it passes; the structural half must catch broken plumbing (the exact iframe 404) before the founder ever sees it. | Ran live vs prod: **6/6 PASS** on `prev_1783472255315_lsbx` (wellroundedmama.com) — A04 iframe src = `.../previews/prev_1783472255315_lsbx/index.html`, A05 HTTP 200, A06 → live `cs_live_…` Stripe session. |
| 2026-07-03 | **`services/site-builder-editor-canvas.js` — fix editor iframe pointing at a relative path (the "Cannot GET /api/v1/sites/index.html" bug the founder hit).** The editor shell is served from `/api/v1/sites/editor`, but the canvas iframe `src` (and the template-switch handler) used the raw relative filename `index.html`, which the browser resolved against `/api/v1/sites/` → 404. Preview files are actually served at `${baseUrl}/previews/${clientId}/<file>`. Added `previewBase` + `initialFileUrl` in `renderCanvas`, exposed `previewBase` in the client config, added a `fileUrl(file)` helper, and switched both the initial iframe `src` and the template-switcher `iframe.src` to the absolute preview URL. Added the missing `@ssot` tag. | Founder-facing UX bug: the center canvas showed "Cannot GET" instead of the client's real site — exactly the failure the SENTRY pre-alpha gate must catch. | `node --check`; rendered-HTML assertion: iframe src = `.../previews/prev_123/index.html`, `previewBase` present in config. |
| 2026-07-06 | **`services/site-builder-email-templates.js` — `pickSubjectVariant(prospectId, variants=DEFAULT_SUBJECT_VARIANTS)` + `DEFAULT_SUBJECT_VARIANTS`.** Pure, network-free A/B subject-line assignment: deterministic FNV-1a hash of `prospectId` → stable variant index so opens/replies can be attributed per variant. Existing `getEmailSubject`/template exports unchanged. **Built autonomously** by the product-build orchestrator (`BUILD_QUEUE.json` step `sb-ab-subject-testing`) through the live `/build` primitive — the first Site Builder feature the autonomous factory shipped after the `platform_gap_fill_reason` build-gate fix. | Founder ask: A/B test cold-outreach subject lines; and prove the factory can build a real product step end-to-end. | committed `9cfc4e59`; `node --check services/site-builder-email-templates.js` |
| 2026-06-30 | `core/two-tier-system-init.js` now suppresses auxiliary expansion boot services when LifeOS is running in the default `founder_builder` runtime profile. | Site Builder should not auto-inflate the founder/builder alpha runtime; it remains available in full runtime, but no longer piggybacks on the narrower BuilderOS proof surface. | `node --check core/two-tier-system-init.js` |
| 2026-06-25 | **`core/two-tier-system-init.js`** — added `createBlueprintIntakeRoutes` import + registration after `createCommandCenterRoutes`. No change to site builder logic. | Blueprint Intake Service needs to be registered at boot alongside all other route factories. | `node --check core/two-tier-system-init.js` ✅ |
| 2026-05-13 | **Recovery commit — `services/site-builder-postmark-helper.js` first-time committed to git.** File existed as working-tree untracked since RL1 (2026-05-12) but was never pushed to `origin/main`. Also committed: `tests/site-builder-postmark-helper.test.js` (same situation — RL1 regression test, never pushed). Root cause: local rebased onto 32 Railway autonomous commits (`origin/main`); untracked files exposed as missing; stash recovered them; committed here for first time. `npm test` 8/8 pass; compliance 12/12 pass. | Working-tree files must live in git so Railway CI and cold agents can use them. No logic changes — file content unchanged from stash. | `npm test` 8/8; `node --check services/site-builder-postmark-helper.js` |
| 2026-05-12 | **`tests/site-builder-postmark-helper.test.js`** — add missing **`import path from "node:path"`** ( **`ReferenceError: path is not defined`** broke **`npm test`** / RL1 verify step); **`@ssot`** header → **Amendment 05**. | Regression guard must load for CI and **`operator:repair-loop`**. | `npm test` |
| 2026-05-12 | **Operator repair loop RL1 (OH1-linked):** `services/site-builder-postmark-helper.js` — Conductor GAP-FILL after repeated council truncation on queue task **`site-builder-postmark-send`** (`SITE_BUILDER_AUTONOMOUS_QUEUE`). `scripts/operator-repair-loop-once.mjs` + **`npm run operator:repair-loop`** — detect quarantine pattern → **`node --check`** → remove **`site-builder-postmark-send`** from **`data/quarantined-tasks.json`** → append **`quarantine-cleared-tasks.json`** (`operator_repair_loop_rl1_gap_fill_postmark_helper`) → **`npm test`** → append **`data/operator-repair-loop-log.jsonl`**. `tests/site-builder-postmark-helper.test.js` — regression (no-token + dry_run). **`package.json`** **`test`** includes new test file. | Adam: one finished detect→repair→verify→receipt loop tied to heart monitor / quarantine receipts; no new daemons. | `npm test`; `npm run operator:repair-loop`; `npm run operator:status` |
| 2026-05-11 | **NSSOT audit + root-cause fixes.** `selfQuarantineTask()` in `lifeos-builder-continuous-queue.mjs` now checks `quarantine-cleared-tasks.json` before writing — cleared tasks can no longer be re-quarantined by the daemon. `SITE_BUILDER_AUTONOMOUS_QUEUE.json` — 3 tasks with `target_file: routes/site-builder-routes.js` fixed to target NEW standalone files instead. `TC_SERVICE_BUILDER_QUEUE.json` — `tc-webhook-validator` task spec fixed: removed `routes/tc-routes.js` (3463 lines) from context; that was the root cause of 37 consecutive wrong-content builds. `services/prospect-pipeline.js` — restored again (15 lines again after builder commit); restored to 433-line version from commit `174f3844`. `services/tc-morning-digest-service.js` — builder-created but truncated at line 288 inside `formatTCDigestForEmail`; completed missing function body. | Root-cause audit on repeated server crashes. | `node --check` PASS on all modified files |
| 2026-05-11 | **Emergency restore: `services/prospect-pipeline.js` truncated to 13 lines by Codex merge commit `3c3db3a6`.** Restored 433-line full version from git commit `a3df15e7`. | Codex commit "Site Builder prospect outreach — Postmark email send integration" replaced the full service with a 13-line partial stub. Railway would boot but any `/api/v1/sites/prospect` call would silently fail. | ✅ | `node --check services/prospect-pipeline.js` PASS, 433 lines |
| 2026-05-11 | **Emergency restore: `createSiteBuilderRoutes` factory export removed by autonomous builder — server crash on every Railway boot.** `routes/site-builder-routes.js` restored to full 438-line factory version from commit `a3df15e7`. Added `/launch-readiness` endpoint (added by builder in later commits). Root cause: Forge builder queue task `site-builder-launch-readiness-route` repeatedly targeted `routes/site-builder-routes.js`, and each system-build commit overwrote the full factory with a stripped 26-line router (`export default router` — no named `createSiteBuilderRoutes`). Both `core/two-tier-system-init.js` and `server.js` import the named export, causing `SyntaxError: The requested module does not provide an export named 'createSiteBuilderRoutes'` on boot. Fix: restore factory + add `/launch-readiness` route inside factory. Also added `data/quarantine-cleared-tasks.json` exemption system + auditor purge logic to prevent transient 413 failures from being re-quarantined. | Railway server was crash-looping on every start. | `node --check routes/site-builder-routes.js` PASS |
| 2026-05-09 | **Boot-fix: restored 3 builder-truncated files crashing Railway.** `routes/site-builder-routes.js` — truncated at 336 lines by builder commit `7ecd28d0` ("Site Builder prospect outreach — Postmark email send integration"); restored to 438-line correct version. `services/prospect-pipeline.js` — truncated by subsequent builder commit; restored to 433-line correct version. `services/site-builder-quality-scorer.js` — truncated; restored to 78-line correct version. Root cause: builder pushed truncated files directly to origin/main; Adversarial Sentinel (node --check) was built locally but not yet deployed to Railway, so the truncation went undetected for several Railway builds. | Railway app was crashing on every boot restart with `SyntaxError: Unexpected end of input` at site-builder-routes.js:337. Server was in a crash loop — no routes were serving. | `node --check routes/site-builder-routes.js` PASS · `node --check services/prospect-pipeline.js` PASS · `node --check services/site-builder-quality-scorer.js` PASS |
| 2026-04-29 | Added explicit design intelligence via `docs/research/SITE_BUILDER_DESIGN_INTEL_2026_04.md`; upgraded `services/site-builder.js` prompt to enforce stronger modern design, accessibility, trust, and conversion rules; improved generated blog styling consistency; patched `/api/v1/sites/build` to accept `businessUrl` as well as `url`; added missing `@ssot` tags to Site Builder source files. | “Modern” was underspecified, which risks generic output. The lane now has a real design brief, a refresh cadence, a less brittle API, and cleaner SSOT coupling for future supervised runs. | `node --check services/site-builder.js`; `node --check routes/site-builder-routes.js` |
| 2026-04-29 | Added `services/site-builder-quality-scorer.js` to grade generated previews; `services/site-builder.js` now scores each build, attempts a bounded repair pass for weak output, and persists `qualityReport`; `services/prospect-pipeline.js` now blocks outreach into `qa_hold` when the preview is below threshold; `/api/v1/sites/dashboard` now counts `built` and `qa_hold`; added `tests/site-builder-quality-scorer.test.js`. | The lane needed a real quality gate so bad previews do not silently hit prospects. This closes the gap between “we can generate a site” and “we can trust it enough to send.” | `node --check services/site-builder-quality-scorer.js`; `node --check services/site-builder.js`; `node --check services/prospect-pipeline.js`; `node --check routes/site-builder-routes.js`; `node --test tests/site-builder-quality-scorer.test.js` |
| 2026-04-29 | Fixed Site Builder follow-up accounting so failed sends no longer look successful; added `runFollowUpCron()` plus `scripts/site-builder-follow-up-cron.mjs`; patched the migration with `follow_up_count`, `last_follow_up_at`, and `last_contacted_at` columns; added the missing `@ssot` header tag to `services/prospect-pipeline.js`. | The lane claimed day-3/day-7 follow-ups, but there was no runnable cron entry point and the schema omitted columns already used by the service. This made the pipeline drift-prone and unreliable for unattended execution. The `@ssot` tag closes a coupling warning for future supervised runs. | `node --check services/prospect-pipeline.js`; `node --check scripts/site-builder-follow-up-cron.mjs` |
| 2026-04-29 | **BUG FIX — markdown fences in preview HTML (hard blocker):** `services/site-builder.js` `generateSiteHtml()` — stripped `BUILD_COMPLETE` but not the leading ` ```html ` / ` ``` ` fence that AI models routinely wrap output in. Preview sites were saved with markdown fences as first bytes, causing browsers to render raw code instead of a website. Any prospect clicking a preview link before this fix would see ` ```html <!DOCTYPE html... ` as plain text. Fix: 2-line `replace()` strips leading and trailing fences after `BUILD_COMPLETE` strip. Verified live: prior test build `prev_1777510004403_536t` shows the bug; next build will be clean. Also documents: builder (council/claude_via_openrouter) hallucinated a 40-line CJS stub on its `[system-build]` commit `e1573aef` — this commit restores the correct 25KB ESM file. Platform fix needed: builder must inject real file content when `target_file` already exists on GitHub. | Live test caught the bug: preview served ` ```html ` to browser. Hard blocker for any prospect outreach. | `node --check services/site-builder.js`; live re-test |
| 2026-04-29 | Added `docs/products/site-builder/FILE_MANIFEST.json` with required routes, tables, assertions, and completion checks; added `public/overlay/site-builder-landing.html` as the first public front-door sales page for the lane. | Site Builder had real backend code but weaker operational discipline than TokenOS/TC: no manifest/verifier surface and no actual public offer page. These two additions make the lane easier to verify and easier to sell. | `node --check services/site-builder.js`; `node --check services/prospect-pipeline.js`; `node --check routes/site-builder-routes.js` |
| 2026-04-30 | **CRITICAL RESTORE + FENCE FIX:** `services/site-builder.js` was overwritten with a 128-line CJS hallucination stub by the builder (`e1573aef`) — the `git checkout --ours` in the prior session's rebase incorrectly selected the wrong file. This commit restores the real 598-line ESM file from commit `f151e4ae` and applies the fence-stripping fix (`clean.replace(/^```(?:html)?\s*\n?/, '').replace(/\n?```\s*$/, '')`) to `generateSiteHtml()`. Railway was deployed with the broken stub; this commit restores full functionality. | Preview sites still showed `html\n<!DOCTYPE html` (fence not stripped). Root cause: stub never had the real generation logic; fence fix from 2026-04-29 was committed on top of the wrong file. | `node --check services/site-builder.js`; re-test preview URL |
| 2026-04-30 | Improved `services/site-builder-quality-scorer.js` — stricter conversion-focused criteria: single H1, multiple H2s, repeated CTAs, proof/trust section, offer clarity, FAQ/objection handling, sticky mobile CTA, focus styles. Thresholds remain configurable via `SITE_BUILDER_MIN_SEND_SCORE` / `SITE_BUILDER_TARGET_SCORE`, but decisions now use normalized percentage scoring (`scorePct`) instead of mixing raw points with percent thresholds. | Scoring criteria were too forgiving and the first implementation mixed raw-point comparisons with percent thresholds. This keeps gating and repair decisions on the same scale. | `node --check services/site-builder-quality-scorer.js`; `node --test tests/site-builder-quality-scorer.test.js` |
| 2026-04-30 | Added `services/site-builder-quality-scorer.js` — pure-function HTML quality scorer (no deps). `scoreGeneratedSite(html, businessInfo)` now checks 16 criteria and returns raw score, normalized percent (`scorePct`), grade A-F, criteria map, issues list, and `readyToSend` / `recommendedAction`. `scoreSummary(result)` returns a 1-sentence human readable summary. First attempt via groq_llama imported jsdom (not in package.json); GAP-FILL replaced with pure regex. | Needed to gate outreach quality so weak previews can be repaired or held instead of being sent automatically. | `node --check services/site-builder-quality-scorer.js` |
| 2026-04-30 | **Opportunity scoring wired into cold outreach** — `services/prospect-pipeline.js` now runs `scoreProspectUrl()` as Step 0 before building the mock site. Top 3 pain points from the prospect's existing site are passed into `generateOutreachEmail()`. AI prompt updated: email must reference 1-2 specific issues found on the site. Fallback email updated: opening line uses the first detected pain point ("I noticed your site has no mobile optimization — so I built you a free upgrade..."). Supervisor-authored as GAP-FILL (builder cannot reliably modify existing files). | Generic cold emails have low reply rates. Referencing specific problems we detected on the prospect's own site makes the email feel researched, not templated — dramatically increases open/reply rate. | `node --check services/prospect-pipeline.js` |
| 2026-04-30 | **Prospect discovery script** — new `scripts/site-builder-prospect-discovery.mjs` + `npm run site-builder:discover`. Takes `--city`, `--type`, `--count` CLI args. If `GOOGLE_PLACES_KEY` env is set: queries Google Places Text Search API and returns JSON array of `{ name, website, address, rating, city, type, source }`. If not set: prints manual research guidance to stderr (Google Maps, Yelp links) and exits with `[]`. Script fixed as GAP-FILL after builder committed broken imports (`import { console } from 'console'` + `import fetch from 'node-fetch'` which is not in package.json). | Without a prospect discovery path the entire pipeline relies on Adam finding URLs manually. This script enables targeted discovery of wellness businesses in any city. | `node --check scripts/site-builder-prospect-discovery.mjs`; `node scripts/site-builder-prospect-discovery.mjs` → research guidance + `[]` |
| 2026-04-30 | **Prospect opportunity scorer** — new `services/site-builder-opportunity-scorer.js` analyzes a prospect's EXISTING website and returns `opportunityScore` (0-100, high = bad site = pitch first), `grade` (A-F), `painPoints[]`, `strengths[]`, `recommendation`. New `POST /api/v1/sites/analyze` route wired in `routes/site-builder-routes.js`. Uses fetch + regex only (no jsdom/puppeteer). New `prompts/lifeos-site-builder.md` domain prompt for the builder. Builder (`groq_llama`) committed a first-pass but had 6 logic bugs (grade returned number not letter, switch on boolean array broken, responseTimeMs from header not timer, copyright year detected any 4-digit number, recommendation used map+join not find); supervisor rewrote as GAP-FILL. Builder route attempt for existing file also failed (`*rk` pattern + CJS hallucination); route added directly as GAP-FILL per §2.11 exception. | Without prospect scoring, all prospects look equally worth pitching. This lets us prioritize the worst sites and personalize cold outreach with specific pain points. | `node --check services/site-builder-opportunity-scorer.js`; `node --check routes/site-builder-routes.js` |
| 2026-05-01 | Added `scripts/site-builder-live-smoke.mjs` and `npm run verify:site-builder:live` to run a real authenticated Railway build and fail if `qualityReport` is missing from either the top-level response or preview metadata. Also upgraded `scripts/system-railway-redeploy.mjs` to support `POST /api/v1/railway/managed-env/build-from-latest` so supervision can request a fresh Railway source build instead of only restarting the current image. | Live testing proved a real runtime drift problem: `origin/main` contained the quality-gated Site Builder code, but Railway was still serving an older image where `qualityReport` was absent. The lane needed a production truth check and a stronger deploy recovery path. | `node --check scripts/site-builder-live-smoke.mjs`; `node --check scripts/system-railway-redeploy.mjs`; `npm run verify:site-builder:live` |
| 2026-04-30 | **SPA/CDN-block detection in opportunity scorer** — `isSpa: boolean` added to scorer output. Two detection paths: (1) SPA shell markers — HTML < 8KB + React/Next/Gatsby/Nuxt framework markers or `<div id="root/app/main">`; (2) CDN block — HTML < 3KB + response time < 200ms (Railway getting a quick shell from a bot-detection CDN, as seen with massageenvy.com returning 9ms 53/C despite being a well-resourced chain). When `isSpa: true`: score capped at 20, pain points replaced with single "Site uses JavaScript rendering — analysis is limited" message. This prevents false high scores on chain SPAs and large-brand sites that block server-side fetches. | Large brand SPAs were scoring C-F despite being non-prospects because Railway's fetch gets the empty JS bundle shell, not the rendered content. | `node --check services/site-builder-opportunity-scorer.js`; live test: massageenvy.com now scores ≤20 from Railway |
| 2026-04-30 | **Opportunity scorer accuracy upgrade** — `services/site-builder-opportunity-scorer.js` expanded booking detection from 9 keywords to 30+ (adds Boulevard, Phorest, Fresha, Timely, Zenoti, Meevo, Booker, Cliniko, SimplePractice, WooCommerce booking plugins, etc.) plus regex for any `<a href>` containing `/book`, `/booking`, `/appointments`, `/schedule`. Added chain/franchise detection: sites with "find a location", "franchise", "X+ locations" patterns are capped at opportunityScore 30 (C/B) even if their technical gaps would score higher — large chains already have web agencies and won't convert. `isChain: boolean` added to return value. `scripts/site-builder-batch-rank.mjs` surfaces `[CHAIN]` flag in the ranked table output. | MassageEnvy-style chains were scoring D/F despite being bad prospects. This prevents wasting outreach on businesses that can't convert. | `node --check services/site-builder-opportunity-scorer.js`; `node --check scripts/site-builder-batch-rank.mjs` |
| 2026-04-30 | **Email reply auto-detection** — `POST /api/v1/sites/email-reply-webhook` (no command-key auth; verified by `POSTMARK_WEBHOOK_TOKEN` env var). Postmark inbound webhook: when a prospect replies to a cold email, Postmark POSTs to this endpoint, the handler matches the From address to a `prospect_sites` row and advances status to `'replied'`, and logs the reply to `outreach_log`. Status is only advanced if not already `converted`/`lost`/`replied`. Responds quickly (before processing) to prevent Postmark retries. Setup: Postmark → Inbound → set Webhook URL to `{SITE_BASE_URL}/api/v1/sites/email-reply-webhook` and set `POSTMARK_WEBHOOK_TOKEN` in Railway to the same token. | Without this, "replied" status requires manual updates. This closes the automation loop: discovery → rank → build → send → view (auto) → reply (auto) → convert. | `node --check routes/site-builder-routes.js` |
| 2026-04-30 | **Pipeline analytics report** — `scripts/site-builder-pipeline-report.mjs` (`npm run site-builder:report`). Fetches live dashboard + prospects from Railway (using `PUBLIC_BASE_URL` + `COMMAND_CENTER_KEY`), prints color-coded pipeline funnel with ASCII bars, conversion rates (open/reply/close %), warm leads list (viewed/replied = follow up now), recent 10 prospects with status badges, and a contextual next-action prompt. `--json` flag outputs raw API responses for piping to jq. Builder (`groq_llama`) committed with 6 bugs: wrong dotenv import (`import dotenv from`), missing auth headers on both fetches, wrong response shape (used flat `pipelineStats.total` instead of `pipelineStats.pipeline.total`), wrong field names (camelCase vs snake_case from PG), division-by-zero on conversion rates, `--json` branch ran same code as default. Supervisor rewrote as GAP-FILL. | Without a report script Adam has to manually hit dashboard API to understand pipeline health. `npm run site-builder:report` gives a full funnel view in 2 seconds. | `node --check scripts/site-builder-pipeline-report.mjs` |
| 2026-04-30 | **Preview view tracking** — `GET /api/v1/sites/preview-view?id=CLIENT_ID` (no auth, returns 1×1 transparent PNG). Called by a tracking pixel injected into every generated preview site `index.html` (before `</body>`). When a prospect opens their preview link, DB is updated: `status = 'viewed'` (only if currently `sent` or `built`) + `last_viewed_at = NOW()`. Column `last_viewed_at TIMESTAMPTZ` added to migration. This closes the intelligence gap: Adam now knows automatically which prospects are warm without manual status updates. GAP-FILL: `PUBLIC_BASE_URL` not set in local shell. | Without view tracking, "viewed" status had to be set manually and Adam couldn't tell which prospects were actually interested. Now every preview open auto-signals intent. | `node --check routes/site-builder-routes.js`; `node --check services/site-builder.js` |
| 2026-04-30 | **Batch prospect ranker** — new `scripts/site-builder-batch-rank.mjs` (`npm run site-builder:rank`). Takes `--input=prospects.json` (output from `site-builder-prospect-discovery.mjs` or a manual list), `--top=N`, `--min-score=N`, `--output=ranked.json`. Runs `scoreProspectUrl()` on each website with 500ms polite delay, sorts by `opportunityScore DESC` (worst existing sites first = best outreach targets), prints color-coded ranked table to stderr, outputs JSON array to stdout. GAP-FILL: `PUBLIC_BASE_URL` not exported in local shell so builder was unreachable. | Without batch ranking, Adam must manually review discovery output and guess who to pitch first. This script turns the discovery → score → rank → build flow into a single pipeline: `npm run site-builder:discover | node scripts/site-builder-batch-rank.mjs --input=/dev/stdin`. | `node --check scripts/site-builder-batch-rank.mjs` |
| 2026-04-30 | **Warm lead Slack notifications** — `routes/site-builder-routes.js`: added `notifySlack(event, businessName, detail)` helper (best-effort, never throws). Wired into `GET /preview-view` (fires when prospect opens preview, status transitions `sent→viewed`) and `POST /email-reply-webhook` (fires when prospect replies to cold email, status transitions `→replied`). Slack message includes: business name, event type (👀 VIEWED / 💬 REPLIED), preview URL, contact email, lead ID. Requires `SLACK_WEBHOOK_URL` env var in Railway (Slack app → Incoming Webhooks → copy URL). Preview-view handler now uses `RETURNING business_name, preview_url, contact_email` to get data for the notification. Reply webhook adds `snippet` variable (first 200 chars of reply text) for the alert. Added env vars table to `prompts/lifeos-site-builder.md`. Marked warm-lead-notify as DONE in domain prompt next-tasks. | Without notification, Adam has to manually poll the pipeline report to find warm leads. Now any prospect who opens a preview or replies triggers an instant Slack alert so Adam can reach out within minutes while intent is highest. | `node --check routes/site-builder-routes.js`; set SLACK_WEBHOOK_URL in Railway to activate |
| 2026-04-30 | **selectOptimalModel override fix** — `services/site-builder.js`: all `gemini_flash` council calls now include `allowModelDowngrade: false`. Root cause: `selectOptimalModel()` treats any prompt >2000 chars as "complex reasoning" and picks the first council member with "reasoning" specialty — which is `groq_llama` (it appears before `gemini_flash` in `Object.entries(COUNCIL_MEMBERS)`). Even though we explicitly request `gemini_flash`, the optimizer was silently downgrading every site-generation call back to Groq Llama 8B. Confirmed from Railway builder logs: `💰 [MODEL OPTIMIZATION] Using groq_llama instead (complex reasoning task)` on every site build. Fix: `allowModelDowngrade: false` prevents override while keeping free-tier governance intact (the call still goes through cost gates, just won't have model replaced). Applied to generation, repair, and blog generation calls. JSON extraction call on `groq_llama` unchanged (correct — explicit groq, small output). | Even with the previous gemini_flash model routing fix, Railway logs proved all calls were still landing on groq_llama due to optimizer. | `node --check services/site-builder.js`; verify Railway logs no longer show `MODEL OPTIMIZATION` override on site build |
| 2026-04-30 | **Cold email + quality audit** — `services/prospect-pipeline.js` cold email generation fixed: `chatgpt→groq_llama` + `maxOutputTokens:900` (email body is ~300-500 tokens; groq is fast and capable for JSON extraction). Rewrote `scripts/site-builder-quality-audit.mjs`: local file scan (all previews or `--id=prev_xxx`), `--live` flag to re-score via Railway, `--json` output, color-coded grade table with per-site issue list for weak previews, comparison to stored quality score. Added `npm run site-builder:qa` to package.json. | Previous script used `await` on sync function, calculated `scorePct` from wrong formula, had no local file support, no color output, and a malformed `@ssot` comment. | `node --check scripts/site-builder-quality-audit.mjs`; `node scripts/site-builder-quality-audit.mjs` on local previews |
| 2026-04-30 | **Token budget + model routing fix (critical)** — `services/site-builder.js`: site generation and repair calls changed from `callCouncil('chatgpt', ...)` to `callCouncil('gemini_flash', ...)`. Root cause: `chatgpt` alias maps to `groq_llama` (Llama 8B, 4096 token hard limit). `maxTokens` option was silently ignored — council-service reads `options.maxOutputTokens`, not `options.maxTokens`. Default `baseScopedMaxTokens` cap was 800 tokens. With 800-token output, the full 15-section click funnel was always truncated before FAQ/pricing sections. Fix: all generation/repair calls now use `gemini_flash` (free, ~8192 tokens output) with `maxOutputTokens: 14000`. JSON extraction (`extractBusinessInfoWithAI`) kept on `groq_llama` with `taskType: 'extraction'` — fast JSON is exactly what Groq 8B is good at. Blog generation switched to `gemini_flash` (3 posts × 600-800 words = ~3k tokens, exceeds groq's 4096 model limit). Added `site_builder.*` task routes in `config/task-model-routing.js`. Documented `maxOutputTokens` API in task-model-routing.js header. | 35.6%/F smoke test score traced to 800-token truncation — every section after the hero was being cut. This was the most impactful single bug. | `node --check services/site-builder.js`; `node --check config/task-model-routing.js` |
| 2026-04-30 | **Design quality overhaul** — `services/site-builder.js`: added `patchSiteHtml()` method that deterministically injects three elements the quality scorer requires and AI routinely omits: Schema.org JSON-LD (`application/ld+json` — 8pts), keyboard focus-visible styles (4pts), and mobile sticky CTA bar (`fixed bottom-0` — 6pts). Also injects contact info from scraped business data if the AI body is missing it (8pts) and a pricing fallback sentence if no price signals exist (6pts). Patch runs before AND after each AI repair pass so injected elements are never lost. Increased generation `maxTokens` from 8000 → 14000 and repair `maxTokens` from 9000 → 14000 (gpt-4o supports 16,384 output tokens; prior 8k limit was causing content truncation before FAQ/pricing sections). Increased default `SITE_BUILDER_REPAIR_PASSES` from 1 → 2. Fixed `hasFocusStyles` regex in `site-builder-quality-scorer.js` to match CSS pseudo-class syntax (`:focus-visible{` not just `focus-visible:`) — the original check was broken and never passed for well-formed CSS. Net effect: a minimal-content page tested at 57.7%/D → 88.5%/B READY after patch alone; real generated sites should reliably clear the 72% send threshold. | Live smoke test was scoring 35.6%/F — previews couldn't be sent, blocking all revenue. Root causes: AI was truncating before FAQ/pricing sections due to 8k token cap; schema/focus/sticky CTA were inconsistently generated; focus-styles scorer regex was broken. | `node --check services/site-builder.js`; `node --check services/site-builder-quality-scorer.js`; `node --input-type=module` unit test → 88.5%/B READY |
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

## Change Receipts

| Date | What changed | Why | Status | Verified |
|---|---|---|---|---|
| 2026-07-03 | **SENTRY generalized across all products (SO-002).** New product-agnostic engine `scripts/sentry-prealpha-gate.mjs` runs any product declared in `builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json` (Layer A + Layer B, fail-closed) and writes a per-product solution-mandatory self-fix feed `products/receipts/SENTRY_FINDINGS_FEED.<id>.json`. Site Builder is registered (delegates to its proven composite gate); `lifeos-founder-ui` is registered with the real-app E2E as Layer B. npm: `sentry:gate`, `sentry:gate:all`, `sentry:gate:list`. | Chair consensus `LIFERE_COUNCIL_1783489419170` — after rank-7 deploy-truth, generalizing SENTRY is the highest-leverage structural move. Founder delegated the decision to Chair+conductor. | ✅ | `lifeos-founder-ui` gate ran live: real browser E2E, failed closed on 4 real defects, feed emitted 4 findings / 0 without a solution. `--list` shows both products. |
| 2026-07-09 | **SENTRY pre-alpha gate now self-provisions a preview fixture.** `scripts/sentry-site-builder-prealpha-gate.mjs` gained `ensurePreview()`: it reuses an existing editable preview, else builds one via the ASYNC prospect path (`POST /api/v1/sites/prospect {skipEmail:true}` → 202 → poll status) before running Layer A/B. Synchronous `POST /api/v1/sites/build` 502s at Railway's ~75s edge timeout and never persists, so with previews on ephemeral disk (wiped every redeploy) the completion gate failed closed forever — every site-builder step blocked (`verify_exit_1`) and the never-stop loop thrashed (endless `[never-stop] queue status` commits), which also blocked deploy-truth SHA parity. | Founder: system must fix itself without burning credits; loop was thrashing on `sb-editor-onboarding-copy`. Chair consensus `LIFERE_COUNCIL_1783489419170`. | ✅ | Live prod: fixture built (`prev_1783490287428_nk2t`, status `built`), gate PASS — Layer A 7/7, Layer B 8/8, self-fix feed emitted 3 findings (0 without a solution). |
| 2026-07-07 | **Railway Gmail SMTP hardening.** `NotificationService` resolves `smtp.gmail.com` to IPv4, connects with `tls.servername`, and forces port **465** on Railway when env says 587 (587 STARTTLS was hitting IPv6 ENETUNREACH). | Prod resend still failed on `:587` IPv6 despite lookup callback. | ✅ | prod resend-outreach |
| 2026-07-07 | **Resend fast path + SMTP 465 default.** `resendOutreachEmail()` uses fallback template (no council wait). `NotificationService` defaults SMTP port **465** with connection timeouts + IPv4 lookup. | Resend endpoint timed out on AI copy + SMTP connection; prod needs reliable one-click resend. | ✅ | prod `POST …/resend-outreach` |
| 2026-07-07 | **SMTP IPv4 on Railway.** `core/notification-service.js` — custom `lookup()` forces IPv4 DNS for Gmail SMTP (Railway containers cannot reach IPv6 smtp.gmail.com:587). | Resend returned `ENETUNREACH` on IPv6 after suppression fix unblocked sends. | ✅ | prod resend-outreach after deploy |
| 2026-07-07 | **Email send unblock + resend.** `db/migrations/20260707_repair_email_suppressions_schema.sql` repairs minimal OCR `email_suppressions` tables missing `suppressed` column (NotificationService was fail-closed → all outreach blocked). `core/notification-service.js` — resilient suppression check + `outreach_log.sent_at` column. `services/prospect-pipeline.js` — records `emailSendError` in metadata; new `resendOutreachEmail()`. `POST /api/v1/sites/prospects/:clientId/resend-outreach`. | Async build worked but email never sent — suppression schema drift blocked every recipient. | ✅ | `node --check` on touched files |
| 2026-07-07 | **Async prospect pipeline (system capability SB1).** New `services/site-builder-prospect-runner.js` — `enqueueProspectJob`, `getProspectJobStatus`, `evaluateSiteBuilderEmailReadiness` (Gmail SMTP or Postmark). `POST /api/v1/sites/prospect` returns **202** by default; `GET /api/v1/sites/prospects/:clientId/status` for polling; `sync=true` for local debug only. `services/prospect-pipeline.js` — `reserveProspectJob`, `failProspectJob`, UPSERT on `recordProspect`, passes reserved `clientId` through build. Launch-readiness SMTP-aware. Pilot script polls async jobs. Tests: `tests/site-builder-prospect-runner.test.js`. | Railway 502 on long sync builds blocked cold email to Adam; prospect outreach must be a reliable system capability, not a fragile HTTP call. | ✅ | `node --test tests/site-builder-prospect-runner.test.js`; `node --check` on touched files |
| 2026-07-07 | **Entry monetization path shipped.** (1) `config/site-builder-pricing.js` — founder entry model: **$49 publish**, $97/mo care, upsell catalog prices. (2) `services/site-builder-entry-checkout.js` + `routes/site-builder-checkout-routes.js` — Stripe checkout + success verification → `prospect_sites.status=converted`. (3) `services/site-builder-editor.js` + `routes/site-builder-editor-routes.js` — 3-pane editor shell, `/edit` `/save-edits` `/revert` `/select-service`. (4) `services/site-builder.js` — `editToken`, preview chrome (editor + publish CTA), variant switcher publish links. (5) `services/site-builder-service-catalog.js` — real upsell prices. (6) Founder runtime wires `NotificationService` + checkout + editor routes. (7) `scripts/site-builder-pilot-prospects.mjs` + `npm run site-builder:pilot`. Launch-readiness now checks Stripe + email provider. | Founder: start building entry product — free preview, $49 publish, second-sale sidebar; get to money. | ✅ | `node --check` on touched routes/services |
| 2026-07-06 | **Design-template library + variant toggle + Logo Studio + no-free-tier-in-product rule.** (1) New `services/site-builder-design-systems.js` — a curated library of 10 cutting-edge design systems (Editorial Luxe, Organic Warm, Clinical Clean, Bold Gradient, Luxe Minimal, Dark Aura, Neo-Retro, Swiss Grid, Soft Pastel, Refined Brutalist); each is a full prose directive block (typography/palette/layout/components/motion) injected into the generation prompt. Exports `getDesignSystem`, `pickDesignSystems`, `renderDesignSystemDirectives`. (2) `services/site-builder.js` `generateSiteHtml()` accepts `options.designSystem` and injects its directives; new `buildVariants()` builds N designs of the same site (shared content, only the design system changes) and writes a **variant-switcher** `index.html` that lets the client toggle between designs live and click "Use this design" (best-effort beacon → hot-lead Slack alert). (3) New `services/site-builder-logo-studio.js` — a self-contained interactive Logo Studio (6 layouts, icon set, fonts, palettes, live SVG preview, SVG/PNG download, auto text-fitting) served at `GET /api/v1/sites/logo-studio`. (4) Routes: `POST /api/v1/sites/build-variants`, `GET /api/v1/sites/design-systems`, `GET /api/v1/sites/logo-studio`, `GET /api/v1/sites/select-design`. (5) **Founder rule (no free-tier model in a product):** generation fallback changed `gemini_flash` → `openai_gpt` (paid); repair pass + blog content moved from `gemini_flash` to the strong `SITE_BUILDER_GEN_MODEL`. | Founder: "their design taste is probably trash — OUR templates should be many, custom, cutting-edge, and they should be able to toggle between them… and a logo designer if they want to play with logo design." Plus: "we don't use any free-tier AIs for a product." | ✅ | `node --check` all touched files; live build of 3 variants (editorial-luxe 92.3, bold-gradient 88.5, organic-warm 88.5) — screenshots confirm 3 visually distinct designs, working toggle, no fabricated pricing/stats; Logo Studio rendered + verified |
| 2026-07-06 | **Truthful generation + real-data enrichment + design-model upgrade.** `services/site-builder.js`: (1) generation prompt rewritten with a top-priority TRUTH RULE — the model may no longer invent prices, star ratings, review/client counts, years-in-business, or named testimonials; social-proof bar and pricing tiers are omitted when no real data exists (was: prompt literally told it to invent "200+ served / 5★" stats and "buyable" price tiers). (2) New `enrichWithRealData()` searches the business's live web presence (Google/Yelp/Facebook) for REAL rating/reviews/facts via real search providers only (no AI-memory fallback) and injects a `VERIFIED REAL DATA` block into the prompt; fails closed (no data → nothing used) when no `BRAVE_SEARCH_API_KEY`/`PERPLEXITY_API_KEY` is set. (3) Generation model now `SITE_BUILDER_GEN_MODEL` (default `claude_sonnet`, 16k output) for better design, falling back to `gemini_flash` on provider error. | Founder review: generated sites fabricated pricing/stats/testimonials not on the prospect's real site (FTC risk previously logged in Gate 3) and design quality was weak. | ✅ | `node --check services/site-builder.js`; `npm test` (302 pass) |
| 2026-07-05 | **Critical bug repair.** `db/migrations/20260705_repair_prospect_sites_schema.sql` now repairs `prospect_sites` in place instead of dropping/recreating it; `routes/site-builder-routes.js` now serves previews through `express.static` rooted at `public/previews` and fails the Postmark reply webhook closed when `POSTMARK_WEBHOOK_TOKEN` is unset. Added `tests/site-builder-routes-security.test.js` plus migration safety coverage. | Auto-migration boot could delete existing production prospect rows, `/previews/*` could traverse outside the preview root, and an unset webhook token allowed unauthenticated status mutations. | ✅ | `node --test tests/migration-safety.test.js tests/site-builder-routes-security.test.js`; `node --check routes/site-builder-routes.js` |
| 2026-07-05 | **`routes/site-builder-routes.js`** — launch-readiness endpoint now checks only Site Builder env vars (`POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`, `SLACK_WEBHOOK_URL`) instead of all platform vars via `getRegistryHealth()`. Returns structured `capabilities` object (site_build, preview_serving, cold_email_sending, etc.) and removes false revenue blockers (TC_IMAP_*, GOOGLE_*) that are unrelated to Site Builder. Removed unused `getRegistryHealth` import. | Launch-readiness reported TC Service and Google OAuth vars as Site Builder blockers, masking the real 2-var blocker (Postmark + email sender). | ✅ | `node -c routes/site-builder-routes.js` |
| 2026-05-12 | **`tests/site-builder-postmark-helper.test.js`** — **`import path from "node:path"`** (fix **`npm test`**). | RL1 verify gate must pass in CI. | ✅ | `npm test` |
| 2026-05-12 | **RL1:** `services/site-builder-postmark-helper.js`; `scripts/operator-repair-loop-once.mjs` + **`npm run operator:repair-loop`**; `tests/site-builder-postmark-helper.test.js`; **`package.json`** `test` list; quarantine + **`quarantine-cleared-tasks`** for **`site-builder-postmark-send`**. | OH1 showed dominant quarantine wound; one closed repair loop (GAP-FILL + verify + receipt). | ✅ | `npm test`; `npm run operator:repair-loop` |
| 2026-05-11 | `core/two-tier-system-init.js` — mounted `site-builder-pipeline-report-routes.js` (self-mounting via `app.use('/api/v1/sites', router)`) and `site-builder-discovery-routes.js` (mounted as `app.use('/api/v1/sites', createDiscoveryRoutes(...))`). Routes are now live at `GET /api/v1/sites/pipeline-report` and `POST /api/v1/sites/discover`. | Route files existed on disk but were not wired into startup — endpoints would 404 without this mount. | ✅ | node --check |
| 2026-05-11 | `routes/site-builder-discovery-routes.js` + `routes/site-builder-pipeline-report-routes.js` — new standalone route files generated by Forge (retargeted Forge tasks). Added @ssot tag to discovery routes. Both pass node --check. | Forge tasks were retargeted to standalone files in root-cause fix; builder generated the files in this merge window. | ✅ | node --check both files |
| 2026-05-10 | `routes/site-builder-routes.js` — restored from truncated 7-line builder commit to minimal valid state: `GET /launch-readiness` returns `getRegistryHealth()` output (revenue blockers + missing needed vars). Prior builder commits repeatedly truncated this file trying to add `getPipelineReportStats` from a function that does not exist in `prospect-pipeline.js` — each attempt left the file with a broken import statement. Removed the phantom import; file is now syntactically valid and exports the readiness check correctly. | NSSOT audit compliance gate: 3 syntax errors detected by compliance officer. This file was the root of one of them. `getPipelineReportStats` was never exported from prospect-pipeline.js. | ✅ | `node --check routes/site-builder-routes.js` |
