# AMENDMENT 05 — Site Builder & Prospect Pipeline
**Status:** INFRASTRUCTURE COMPLETE — awaiting Railway env vars to go live
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

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
| `services/prospect-pipeline.js` | Mock site + cold email outreach |
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
- **NEED:** POS affiliate program signups → then set `AFFILIATE_*_URL` env vars in Railway
- **THINK:** Puppeteer scraping may fail on JS-heavy sites (SPA) — AI-only fallback exists
- **DON'T KNOW:** Whether Railway has been redeployed since these code changes were committed

---

## NEXT ACTIONS (Do in this order)

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
Check the response for `previewUrl` — open it in browser to see the generated site.

### Step 4 — Send first 5 real prospects (begins revenue pipeline)
Find 5 local wellness businesses with bad websites (Google Maps search: "midwife [your city]", "massage therapist [your city]"), then:
```bash
curl -X POST https://your-app.railway.app/api/v1/sites/prospect \
  -H "x-command-center-key: $COMMAND_CENTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"businessUrl":"https://their-site.com","contactEmail":"owner@their-site.com","contactName":"Jane"}'
```

### Step 5 — Set up auto follow-up cron (maximizes conversion rate)
Add a daily cron job that calls `POST /api/v1/sites/follow-up` for prospects at day 3 and day 7.
This is the next code task — not yet built.

---

## REFACTOR PLAN (Future)
1. Add auto follow-up cron — day 3 and day 7 follow-ups sent automatically (next build task)
2. Add site customization UI — let client pick colors, services, photos from command center
3. Add A/B testing for cold email subject lines
4. Add prospect scoring — prioritize businesses with worst existing websites
5. Add live edit mode — client can edit their preview before going live
6. Add preview site expiry cron — clean up unsold previews after 30 days

---

## NON-NEGOTIABLES (this project)
- Cold emails MUST have consent tracking — do not email the same address twice without consent
- `skipEmail: true` must be available for building sites without sending emails
- Preview sites expire after 30 days unless client converts — add cleanup cron
- Site build must not include competitor brand names or misleading claims
- All generated testimonials must be clearly labeled as illustrative examples until replaced with real ones
- POS recommendations must disclose affiliate relationship in client-facing materials
