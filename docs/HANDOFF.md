# SESSION HANDOFF — 2026-03-13
**For:** Next Claude session picking up this work
**Branch:** pr-cleanup-1

---

## WHERE WE ARE

server.js went from **15,000 → ~2,088 lines** (86% reduction). The platform is now fully modular with 36 route files, 35 service modules, and 6 core modules. Zero circular dependencies. Zero syntax errors.

**Current git log (most recent first):**
```
e6bfad63  feat: production readiness — env validation, rate limits, expiry cron, CI
8499eae9  fix+refactor: resolve 5 critical bugs + extract 7 more modules
f24e9032  refactor: extract all 15 project amendments + fix 3 critical init bugs
```

---

## WHAT'S FULLY DONE ✅

### Infrastructure
- server.js: 2,088 lines, pure startup/wiring, `node --check` PASS
- 36 route files in `routes/` — one per project
- 35 service files in `services/`
- 6 core business logic files in `core/`
- Zero circular dependencies (verified madge 147 files)
- 5 critical runtime bugs fixed (init order, undefined vars)

### Production Readiness
- `services/env-validator.js` — throws at startup if DATABASE_URL/ANTHROPIC_API_KEY/COMMAND_CENTER_KEY missing
- `services/preview-expiry-cron.js` — deletes preview sites >30 days old (Amendment 05 non-negotiable)
- `services/db-health-monitor.js` — warns when DB pool >70% utilized
- `middleware/request-tracer.js` — UUID on every request, all requests logged
- `middleware/error-boundary.js` — global catch, never exposes stack traces in prod
- Rate limiting on site builder: 10 builds/IP/hr, 50 prospects/IP/hr
- GitHub Actions smoke test in `.github/workflows/smoke-test.yml`
- Improved `/healthz` that tests DB + checks AI/email configured

### SSOT Amendments
- 15 amendments in `docs/projects/AMENDMENT_01_*.md` through `AMENDMENT_15_*.md`
- `docs/projects/INDEX.md` — complete module registry, accurate line counts

### DB (Neon Production — CONFIRMED LIVE)
- `prospect_sites` table ✅
- `email_suppressions` table ✅
- `outreach_log` table ✅
- Core schema in `db/migrations/20260313_core_schema.sql`

### Site Builder (Amendment 05)
- Full pipeline: scrape → AI generates Tailwind click-funnel → deploy → cold email
- Postmark (NotificationService) wired as email sender with suppression
- POS affiliate URLs driven by env vars
- All code complete — **blocked only on Railway env vars**

---

## WHAT STILL NEEDS TO HAPPEN (Priority Order)

### 1. SET RAILWAY ENV VARS — Enables Revenue (15 min)
Go to Railway → project → Variables. Add:
```
EMAIL_PROVIDER=postmark
EMAIL_FROM=adam@hopkinsgroup.org  (or whatever From address)
POSTMARK_SERVER_TOKEN=<from postmark.com → Server → API Tokens>
SITE_BASE_URL=https://your-app.railway.app
```
This unblocks cold email sending.

### 2. REGISTER POS AFFILIATE PROGRAMS — Enables Commission Income (30 min)
- Jane App: jane.app/affiliates → get link → set AFFILIATE_JANE_APP_URL in Railway
- Mindbody: mindbodyonline.com/partner → get link → set AFFILIATE_MINDBODY_URL
- Square: squareup.com/us/en/referral → set AFFILIATE_SQUARE_URL

### 3. TEST SITE BUILDER END-TO-END (10 min)
```bash
curl -X POST https://your-app.railway.app/api/v1/sites/build \
  -H "x-command-center-key: $COMMAND_CENTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"businessUrl":"https://example-wellness.com","skipEmail":true}'
```
Verify `previewUrl` in response, open in browser.

### 4. SEND FIRST 5 REAL PROSPECTS — Starts Revenue Pipeline
Find 5 local wellness businesses (Google: "midwife [city]", "massage therapist [city]"):
```bash
curl -X POST https://your-app.railway.app/api/v1/sites/prospect \
  -H "x-command-center-key: $COMMAND_CENTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"businessUrl":"URL","contactEmail":"EMAIL","contactName":"NAME"}'
```

### 5. ADD JSDoc HEADERS — Gets to 9/10 (1 hour)
Every module should have a header like:
```js
/**
 * Site Builder — scrapes existing business websites and generates
 * complete Tailwind click-funnel sites with SEO, blog posts, and YouTube integration.
 *
 * Dependencies: callCouncil (AI), previewsDir (static hosting), baseUrl
 * Exports: SiteBuilder (class), POS_PARTNERS (const)
 */
```
Run an agent across all files in services/, core/, routes/.

### 6. LOAD TEST — Knows Breaking Point (1 hour)
```bash
npm install -g autocannon
autocannon -c 50 -d 30 "https://your-app.railway.app/healthz"
autocannon -c 10 -d 30 -m POST "https://your-app.railway.app/api/v1/sites/build" \
  -H "x-command-center-key: KEY" -b '{"businessUrl":"https://example.com","skipEmail":true}'
```

### 7. PUSH TO MAIN + DEPLOY
```bash
git checkout main
git merge pr-cleanup-1
git push origin main
```
Railway auto-deploys from main.

---

## ORGANIZATION SCORE: 8.5/10

### To reach 9/10: JSDoc headers on all modules
### To reach 9.5/10: Load test results documented
### To reach 10/10: Consistent export pattern (some modules use factory, some class, some plain fn)

---

## KEY FILE LOCATIONS

| What | Where |
|------|-------|
| All project SSOT Amendments | `docs/projects/AMENDMENT_01_*.md` through `AMENDMENT_15_*.md` |
| Project registry | `docs/projects/INDEX.md` |
| Site builder pipeline | `services/site-builder.js` |
| Cold email pipeline | `services/prospect-pipeline.js` |
| Site builder routes | `routes/site-builder-routes.js` |
| Env validation | `services/env-validator.js` |
| Preview expiry | `services/preview-expiry-cron.js` |
| DB health | `services/db-health-monitor.js` |
| Request tracing | `middleware/request-tracer.js` |
| Error boundary | `middleware/error-boundary.js` |
| Two-tier AI init | `core/two-tier-system-init.js` |
| Notification/email | `core/notification-service.js` |
| env vars template | `env.template` |
| CI workflow | `.github/workflows/smoke-test.yml` |

---

## KNOWN TECHNICAL DEBT (non-blocking)

1. `initializeTwoTierSystem()` is now in `core/two-tier-system-init.js` but server.js still has ~30 `let x = null` variables that get populated by it — could be further cleaned with a single `twoTierState` object pattern
2. Some route files use class pattern, some factory pattern, some plain exports — inconsistent but functional
3. `scheduleAutonomyLoop` signature order is `(name, intervalMs, task, initialDelayMs)` — verify callers match this order
4. `services/autonomy-scheduler.js` was imported early but some functions were also defined inline in server.js — verify no duplicate definitions remain

---

## REVENUE TARGETS (Amendment 05)

| Timeline | Target | How |
|----------|--------|-----|
| Week 1 | First $997 sale | Send 20 prospects manually |
| Month 1 | $500/day | 2 site sales + care plan + POS referrals |
| Month 3 | $3,000/day | Bulk prospect automation + repeat clients |

---

## COMMANDS TO VERIFY HEALTH

```bash
# Syntax check everything
node --check server.js && for f in routes/*.js services/*.js core/*.js; do node --check "$f" || echo "FAIL: $f"; done

# Check circular deps
npx madge --circular server.js

# Count console.* (only startup banner should remain)
grep -c "console\." server.js  # should be ~40 (all in startup banner)

# Check server.js line count
wc -l server.js  # should be ~2,088

# Git status
git log --oneline -5
```
