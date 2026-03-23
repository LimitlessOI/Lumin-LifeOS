# AMENDMENT 17 — Transaction Coordinator (TC) Service
**Status:** BUILDING — infrastructure complete, IMAP vars pending
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-23

---

## WHAT THIS IS

A full Transaction Coordinator service that Adam operates for real estate agents.
The system handles:
- Document intake from email and manual upload → SkySlope
- Deadline tracking and automated reminders
- GLVAR dues monitoring (monthly) and violation monitoring (4× daily)
- MLS deal scanning for investor clients (flip/buy-and-hold/BRRRR)
- TC pricing and billing across three plan tiers
- eXp Realty Okta SSO browser automation for SkySlope and BoldTrail

**Mission:** Give Adam a fully automated TC back-office so he can service multiple agent clients with near-zero manual overhead.

---

## REVENUE MODEL

| Plan | Setup Fee | Monthly | Closing Fee | Notes |
|------|-----------|---------|-------------|-------|
| Founding Member | $500 (one-time) | $249/mo locked forever | $0 | Beta only — never increases |
| Monthly Standard | $0 | $149/mo | $0 | Standard after beta closes |
| Pay at Closing | $0 | $0 | $349/closed deal | $0 if deal falls through |

Setup fee is waivable. Closing fee for founding/monthly agents is $0 (covered by subscription).
Per-transaction agents pay $349 only on closed deals — no charge if the deal dies.

**Revenue triggers:**
- Agent signup → setup fee collected
- Monthly billing → subscription revenue
- Transaction closes → closing fee from escrow

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `services/tc-browser-agent.js` | Puppeteer browser automation — eXp Okta SSO, SkySlope, BoldTrail, GLVAR |
| `services/tc-coordinator.js` | Core transaction management, deadline tracking, party coordination |
| `services/tc-doc-intake.js` | IMAP email scan for executed RPAs + manual upload → SkySlope |
| `services/tc-pricing.js` | Three-tier billing model, agent client registry, revenue summary |
| `services/glvar-monitor.js` | GLVAR dues scraping (monthly) + violation email monitoring (4× daily) |
| `services/email-triage.js` | Inbox scanner — classifies TC contracts, flags for immediate action |
| `services/mls-deal-scanner.js` | AI deal scoring, investor criteria matching, offer drafting |
| `routes/tc-routes.js` | All TC API endpoints |
| `routes/mls-routes.js` | MLS scanning and investor management endpoints |
| `db/migrations/20260322_tc_transactions.sql` | Core transactions table |
| `db/migrations/20260323_tc_fees.sql` | tc_agent_clients, tc_pricing_config, fee columns |
| `db/migrations/20260323_glvar_dues.sql` | glvar_dues_log, glvar_violations_log |
| `db/migrations/20260323_email_triage.sql` | email_triage_log |
| `db/migrations/20260323_mls_investors.sql` | mls_investors, mls_deal_matches |

### Portal Access
| Portal | URL | Purpose |
|--------|-----|---------|
| eXp Realty Okta | exprealty.okta.com | SSO for SkySlope + BoldTrail |
| GLVAR Clareity IAM | glvar.clareityiam.net | MLS + TransactionDesk + dues |
| SkySlope | Via eXp Okta tile | Transaction file management, doc upload |
| BoldTrail | Via eXp Okta tile | Real estate CRM |

### Key Environment Variables
| Var | Purpose |
|-----|---------|
| `IMAP_HOST` | Email server (imap.gmail.com for Google Workspace) |
| `IMAP_PORT` | IMAP port (993) |
| `IMAP_USER` | adam@hopkinsgroup.org |
| `IMAP_PASS` | Email account password (store via /api/v1/railway/managed-env/bulk) |

### API Endpoints (all under `/api/v1/tc/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/transactions` | List all transactions |
| POST | `/transactions` | Create transaction with fee assignment |
| GET | `/plans` | Public — TC pricing plans (no auth) |
| GET | `/clients` | List agent clients |
| POST | `/clients` | Enroll new agent client |
| GET | `/fees/revenue` | MRR, ARR, outstanding fees |
| POST | `/intake/run` | Full email→SkySlope intake run |
| POST | `/intake/email-search` | Dry-run email scan |
| POST | `/intake/upload` | Manual doc upload → SkySlope |
| GET | `/glvar/dues` | Current dues status |
| GET | `/glvar/violations` | Violation log |
| POST | `/test-skyslope-login` | Test eXp Okta → SkySlope connection |
| POST | `/test-boldtrail` | Test eXp Okta → BoldTrail connection |

### MLS Investor Endpoints (under `/api/v1/mls/`)
| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/investors` | Investor registry CRUD |
| POST | `/scan` | Score current MLS listings against all investors |
| GET | `/matches` | Deal matches ready for review |
| POST | `/matches/:id/draft` | Draft offer in TransactionDesk (Adam signs) |

---

## CURRENT STATE

### Done
- ✅ Browser agent — eXp Okta login, SkySlope nav, BoldTrail nav, GLVAR nav
- ✅ TC coordinator — transactions, deadlines, parties, Nevada standard timelines
- ✅ Doc intake — IMAP scan, attachment download, SkySlope upload pipeline
- ✅ Three-tier pricing — founding/monthly/per-transaction, agent registry, revenue dashboard
- ✅ GLVAR monitor — dues cron (monthly), violation cron (4× daily)
- ✅ Email triage — 30-min scan cycle, immediate alerts for TC contracts
- ✅ MLS deal scanner — AI scoring, investor criteria matching, offer draft workflow
- ✅ All DB migrations written
- ✅ Railway managed-env bootstrap — one-time token endpoint to self-manage vars
- ✅ `POST /bulk` now stores in Neon AND pushes to Railway in one call

### Blocking (must resolve before first real transaction)
- 🔲 IMAP vars not yet in Railway — set via `POST /api/v1/railway/managed-env/bulk`
- 🔲 eXp Okta credentials need rotation (shared in conversation — rotate before use)
- 🔲 adam@hopkinsgroup.org password needs rotation (shared in conversation)
- 🔲 Run `POST /api/v1/tc/intake/email-search` dry run to verify email scan works
- 🔲 Run `POST /api/v1/tc/test-skyslope-login` to verify SSO works

### Next milestones
- First real transaction intake end-to-end (email → SkySlope)
- First paying agent client enrolled
- MLS investor registry populated with at least one buyer profile

---

## NON-NEGOTIABLES

- Adam signs ALL offers — system drafts for review only, never submits automatically
- Closing fees for per-transaction clients collected from escrow only — never charged if deal falls
- Setup fee can be waived at Adam's discretion — `waivedSetup: true` in createAgentClient()
- All browser sessions use screenshots at every step for audit trail
- IMAP credentials stored encrypted in Neon via managed-env service — never in plaintext

---

## REFACTOR STATUS
- All feature code in `routes/tc-routes.js`, `routes/mls-routes.js` and service files
- No TC logic in `server.js` except service initialization
- Boot logic moves to `startup/boot-domains.js`
