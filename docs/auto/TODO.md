# Profit Engine Tasks — Active 15-Min Cycle

## 1. Passive Revenue Pages
- Purpose: Auto-generate local "Property + Calendar" landing pages for agents.
- Files: `src/routes/auto-pages.js`, `public/offers/`
- Hint: Pull listings from BoldTrail API, create static HTML pages with call-to-action buttons linked to agent calendars, and publish to `/offers/{city}`. Log results to `/reports/landing-pages.md`.

## 2. Affiliate Offer Engine
- Purpose: Build `/offers/` pages with product recommendations for homebuyers, investors, and lifestyle niches.
- Files: `src/routes/affiliate-sync.js`, `docs/offers/offers.json`
- Hint: Use Amazon/Awin links from `offers.json` and generate short markdown pages that convert to HTML. Add them to sitemap.

## 3. Automated Email & SMS Follow-Up
- Purpose: Contact new leads automatically.
- Files: `src/routes/follow-up.js`
- Hint: When a new lead is added to BoldTrail or `calls`, send a warm text/email using SendGrid + Twilio with a personalized message and booking link.

## 4. Recruit Agent Funnel
- Purpose: Auto-build a “Join Our Team” recruiting page with embedded video and Stripe calendar for consultations.
- Files: `docs/marketing/recruit-funnel.md`, `public/recruit/index.html`
- Hint: Generate text and layout via OpenAI using `gpt-4o-mini`, pulling from agent success stories.

## 5. AI Newsletter Automation
- Purpose: Auto-generate and email a daily local real estate market newsletter.
- Files: `src/routes/newsletter.js`, `docs/newsletters/`
- Hint: Summarize MLS/BoldTrail activity and send through SendGrid to the `subscribers` table.

## 6. Report Monetization
- Purpose: Generate weekly market reports and post Stripe payment links for paid access.
- Files: `src/routes/report-monetize.js`, `docs/reports/`
- Hint: Wrap `/reports/YYYY-MM-DD.md` into PDFs and charge via `STRIPE_PRICE_FULL`.

## 7. Local SEO Pages
- Purpose: Create “Buy a Home in {City}” SEO pages for organic ranking.
- Files: `src/routes/seo-builder.js`
- Hint: Use OpenAI to write local area guides and auto-deploy them to `/areas/{city}`.

## 8. Course Builder
- Purpose: Compile AI transcripts and insights into e-books/courses for sale.
- Files: `src/routes/course-builder.js`, `docs/courses/`
- Hint: Combine conversation data into “LifeOS Growth Playbook” format, sell through Stripe link.

## 9. Lead Reactivation
- Purpose: Find inactive leads and re-engage.
- Files: `src/routes/lead-reactivate.js`
- Hint: Detect leads older than 30 days without activity; send a friendly text and tag in BoldTrail.

## 10. Offer API for Partners
- Purpose: Let other agents access your best-performing offer pages.
- Files: `src/routes/offers-api.js`
- Hint: Create `/api/v1/offers/list` and `/api/v1/offers/details/:id` with simple JSON output.

---
## 11–20 (Later Phases)
1. Autogenerate TikTok/YouTube video scripts from reports.
2. Create “Local Hero” sponsorship spots in email newsletters.
3. Launch “Autopilot as a Service” to sell to small teams.
4. Enable subscription billing for newsletter reports.
5. Add referral payout tracking via Stripe Connect.
6. Publish an open “market index” dashboard.
7. Create a “Book a Call” overlay widget for all offers.
8. Add AI recruiter that messages potential agents.
9. Generate weekly social media posts automatically.
10. Run nightly analytics and post summary charts.

---

## Deployment Notes
- Each task should be scaffolded into a new branch via `/internal/autopilot/build-now`.
- Autopilot runs every 15 minutes.
- External webhook (`DISPATCH_WEBHOOK_URL`) should post build summaries to Zapier/n8n for lead or marketing automation.
