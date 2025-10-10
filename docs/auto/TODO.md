# High-value tasks the autopilot can pick from

# High-Value Build Tasks — Active 15-Min Cycle

1. **Create /api/v1/build/dispatch**
   - Purpose: Forward completed build plans to an external webhook (Zapier, n8n, or marketing automation pipeline).
   - Files: `src/routes/dispatch.js`
   - Hint: Should read POST body { plan } and send JSON to process.env.DISPATCH_WEBHOOK_URL

2. **Add /api/v1/leads/sync**
   - Purpose: Sync BoldTrail leads into our local Postgres `calls` table.
   - Files: `src/routes/leads-sync.js`
   - Hint: GET from BoldTrail `/v1/leads?status=open`, write new entries if missing.

3. **Add /overlay/agent-dashboard.html**
   - Purpose: Display IDX search + connected calendar link for eXp agents.
   - Files: `public/overlay/agent-dashboard.html`
   - Hint: Embed BoldTrail IDX iframe and add agent’s Calendly link from DB.

4. **Create docs/marketing/landing-outline.md**
   - Purpose: Draft copy + structure for the “Join Our eXp Team” recruiting funnel.
   - Hint: Should include headline, video section, and CTA to “Book a Call”.

5. **Add /api/v1/reports/email**
   - Purpose: Email nightly performance report to admin using SendGrid.
   - Files: `src/routes/report-email.js`
   - Hint: Pull most recent `/reports/YYYY-MM-DD.md` and email to ADMIN_EMAIL.
