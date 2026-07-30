<!-- SYNOPSIS: Market-readiness audit and implementation plan for every active product. -->
<!-- @ssot docs/products/INDEX.md -->

# Market Readiness Plan — All Products

**Date:** 2026-07-23  
**Live deploy tip:** `dd2c792d656495a8b7dbf49f520345fd8c5c7573` (`https://lumin-web-production-e3a9.up.railway.app`)  
**Truth labels used:** KNOW / THINK / GUESS / DON'T KNOW per `docs/constitution/NORTH_STAR_SSOT.md`.

## What "market ready" means

A product is **market ready** when a stranger can sign up, pay, receive the promised value, and recover from common problems without needing the founder.

Minimum evidence required:
1. **Public surface** — public URL that loads and explains the offer.
2. **SENTRY pre-alpha** — Layer A (structural) **and** Layer B (real-browser human-sim) PASS with 0 blockers.
3. **Payment path** — live Stripe Checkout (`cs_live_`) or invoice created; money can reach the account.
4. **Delivery path** — the purchased artifact, session, export, or service is actually produced and delivered.
5. **Account recovery** — forgot-password email sends to a real inbox, or support path is explicit.
6. **Founder usability pass** — a non-engineer can complete the full loop without being rescued.
7. **Operational truth** — product home, receipt, and production deploy SHA match.

---

## Executive summary (KNOW)

- **1 product is closest to market ready:** SocialMediaOS pack sales (`marketingos/socialmediaos`) — SENTRY PASS and live checkout both work; blocked only by external email + a real card charge.
- **2 products now have SENTRY pre-alpha PASS on current tip:** `marketingos` and `site-builder` (Layer A+B), plus `lifeos-founder-ui` (Layer A+B).
- **Several products are code-complete on technical acceptance but `founder_usability_pass: false`:** LifeRE, LifeOS commitments/inbox.
- **Several products are partial code or missing credentials:** ClientCare Billing Recovery, Video Pipeline, Outreach CRM, AI Receptionist.
- **Many products are still vision documents** and need a `FOUNDER_PACKET` + `BLUEPRINT.json` before implementation.

The single biggest cross-cutting blocker is **email delivery**: Postmark was canceled; the code now supports Resend/SMTP fallback, but no `RESEND_API_KEY` or SMTP credentials are in Railway. A new email provider must be chosen, configured, and every mail path re-proved before any customer-facing product is truly market ready.

---

## Product-by-product audit

| Product | Status | Market-ready? | Blocking gap | Next action (owner) | Size |
|---|---|---|---|---|---|
| **SocialMediaOS** | Soft-launch ready, 90% | NO — external email + real card charge unproved | Postmark canceled; no `RESEND_API_KEY` configured; live $49 charge not completed | 1. Pick new email provider + add key to Railway. 2. Complete a live $49 checkout and `pack/verify`. 3. Re-prove forgot-password to a real inbox. | Small |
| **Site Builder** | SENTRY Layer A+B PASS on current tip, checkout works | NO — real conversion unproved, email follow-up unproved | SENTRY passes; Postmark-dependent follow-up; no real customer walkthrough | 1. Replace Postmark with new provider + verify domain. 2. Founder completes one real preview → purchase. | Small-Medium |
| **LifeOS founder UI** | SENTRY PASS, new ChatGPT-style layout live | NO — no paid product or conversion path | No packaged offer or checkout tied to the UI | 1. Pick first paid LifeOS feature. 2. Add Stripe price + checkout. 3. SENTRY re-prove paid flow. | Medium |
| **LifeRE OS** | `npm run lifeos:lifere-os:v1-acceptance` 19/19 PASS, runtime active | NO — `founder_usability_pass: false`, no money proof | Founder has not completed daily cycle end-to-end; no paid tier checkout | 1. Founder uses `/lifeos-app.html?mode=lifere` for 3 days. 2. Fix UX friction. 3. Add Stripe checkout for LifeRE Pro. | Medium |
| **AI Receptionist** | Code exists, $99/mo offer | NO — no SENTRY pass, no live call proof, no verified domain/number | Needs Twilio/phone number, voice provider, and a real test call | 1. Provision Twilio number. 2. Run SENTRY Layer A+B. 3. Run one real inbound call. | Medium |
| **ClientCare Billing Recovery** | Partial code, credentials missing | NO — SENTRY finding: `ClientCare browser credentials not configured` | Missing ClientCare login + browser automation credentials | 1. Add ClientCare credentials to Railway. 2. Re-run SENTRY. 3. Prove one claim discovery. | Small |
| **Video Pipeline** | Partial code | NO — `REPLICATE_API_TOKEN` missing, FFmpeg unverified, no SENTRY | Missing video-gen provider + Railway buildpack check | 1. Add `REPLICATE_API_TOKEN` / `ELEVENLABS_API_KEY`. 2. Verify `ffmpeg` in Railway. 3. Run SENTRY. | Medium |
| **Creative Engine** | Infrastructure live, `footage_edit` mode works | NO — no standalone product surface or checkout | Tied to SMOS/site-builder; needs packaged offer | 1. Create `/creative/studio` public landing + pricing. 2. Add Stripe checkout. 3. SENTRY A+B. | Medium |
| **Outreach CRM** | Code exists, BoldTrail wired | NO — no SENTRY pass, Postmark-dependent, no verified campaign | Needs email provider + consent/anti-spam audit + one real sequence | 1. Replace Postmark. 2. Add sending domain. 3. Send 1 real sequence to 10 opted-in recipients. | Small |
| **BuilderOS** | Internal tools, no public product | NO — this is the factory, not a market product | N/A — keep as factory spine; do not sell separately | 1. Keep internal. 2. Re-prove autonomy closure receipts on current tip. | N/A |
| **AI Council, Memory System, Lumin University, etc.** | Vision/early code | NO — no `FOUNDER_PACKET` / `BLUEPRINT` | Need founder decisions on scope, pricing, and first customer | 1. Write `FOUNDER_PACKET.md`. 2. Build `BLUEPRINT.json`. 3. Run SENTRY. | Large |
| **Game Publisher, Faith Studio, Kids OS, etc.** | Vision documents | NO — no code surface | Same as above; defer until top 5 products are market ready. | Large |

---

## Cross-cutting blockers and fixes

### 1. Email provider (HIGHEST PRIORITY)
**KNOW:** Postmark was removed from Railway. `NotificationService`, password-reset, site-builder prospect follow-up, TC document email, and outreach sequences all use Postmark.

**Fix:**
1. Pick a replacement: **Resend** (recommended for transactional + creator cold outreach), Mailgun, SendGrid, or AWS SES.
2. Add API key + verified sending domain to Railway.
3. Update `services/notification-service.js` and `services/password-reset-email.js` to use the new provider.
4. Re-prove forgot-password, site-builder follow-up, and any outreach sequence.

### 2. Stripe live money proof
**KNOW:** SMOS creates `cs_live_` sessions. Site Builder also creates `cs_live_` checkout. No actual payment has completed on either.

**Fix:**
1. Use a real card on a live checkout URL.
2. Confirm `payment_status: paid` via `/api/v1/marketing/pack/verify` or Stripe Dashboard.
3. Record receipt with `live_card_charge: true`.

### 3. SENTRY Layer B gaps
**KNOW:** `lifeos-founder-ui`, `marketingos`, and `site-builder` SENTRY pre-alpha Layer A+B PASS on current tip (`72549d10b`).

**Fix:** Keep SENTRY receipts current on every deploy.

### 4. Founder usability
**KNOW:** `BP_PRIORITY.json` shows many products as `TECHNICAL_PASS` but `founder_usability_pass: false`.

**Fix:**
1. Adam or a non-engineer tester completes the full user journey for each top product.
2. File UX friction as SENTRY findings or product-home blockers.
3. Re-test until pass.

### 5. AI provider credits
**THINK:** Anthropic, OpenAI, and Together are all showing `needs_payment` in some prior checks. Pack generation and other AI features may run degraded until billing is restored or lower-cost providers are prioritized.

**Fix:**
1. Confirm current provider balances (`npm run builder:preflight` shows `openai_key_loaded: true`).
2. For SMOS, pack generation already fails over to Gemini Flash free tier; confirm this is the default path.
3. Restore paid provider balances or cap usage per task.

---

## Implementation roadmap

### Phase 1 — Unblock all email (Days 1–2)
- [ ] Choose email provider
- [ ] Add API key + verified domain to Railway
- [ ] Update `password-reset-email.js`, `notification-service.js`, `site-builder-prospect-runner.js`
- [ ] Re-prove forgot-password to real inbox
- [ ] Re-prove site-builder follow-up email

### Phase 2 — Close SMOS first dollar (Days 2–3)
- [ ] Complete live $49 charge on `/marketing`
- [ ] Verify `pack/verify` returns `paid: true`
- [ ] Confirm export unlock works for paid user
- [ ] Update `SMOS_REAL_CUSTOMER_READINESS.json`

### Phase 3 — Re-prove Site Builder conversion (Days 3–5)
- [x] SENTRY site-builder Layer A+B PASS
- [ ] Replace Postmark; verify follow-up email reaches a real inbox
- [ ] Founder runs one real preview → purchase flow
- [ ] Update site-builder product home + receipt

### Phase 4 — Package LifeOS / LifeRE paid tiers (Days 5–10)
- [ ] Choose first paid LifeOS / LifeRE feature
- [ ] Add Stripe price + checkout
- [ ] Adam or a non-engineer completes the daily cycle end-to-end (`founder_usability_pass: true`)
- [ ] SENTRY re-prove paid flow

### Phase 5 — Fix credential blockers (parallel)
- [ ] ClientCare: add ClientCare credentials
- [ ] Video Pipeline: add Replicate/ElevenLabs tokens, verify ffmpeg
- [ ] AI Receptionist: provision Twilio number, verify voice provider

### Phase 6 — Vision products → FOUNDER_PACKET (later)
- [ ] For each deferred product, write `FOUNDER_PACKET.md` and `BLUEPRINT.json`
- [ ] Only after top 5 products are market ready

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| New email provider also blocks cold/outreach sends | Medium | High | Use separate domain/subdomain for transactional vs. outreach; warm domain before volume. |
| Stripe live charge fails due to account setup | Low | High | Test with $1 first if possible; confirm webhook endpoint registered. |
| Founder usability finds large UX gaps | Medium | Medium | Scope first paid feature small; use `operator-mark-paid` fallback only for testing. |
| AI provider credits exhausted | Medium | High | Route SMOS generation to free tier; cap other products until billing restored. |
| SENTRY Layer B keeps failing on async timeouts | Medium | Medium | Run after deploy settles; increase wait thresholds; fix first failure. |

---

## Truth summary

- **KNOW:** SocialMediaOS is the closest to market-ready product.
- **KNOW:** Postmark removal blocks email for SMOS, Site Builder, TC, and outreach; code fallback to Resend/SMTP is ready.
- **KNOW:** SENTRY `marketingos`, `lifeos-founder-ui`, and `site-builder` all pass Layer A+B on current tip.
- **THINK:** Resend is the best drop-in replacement for both transactional and creator cold email.
- **DON'T KNOW:** Whether the Stripe account has payouts configured, whether a real card charge will succeed, or the exact balance of AI provider credits.
- **DON'T KNOW:** Which paid feature Adam wants to launch first for LifeOS.

---

## TC Service / LifeRE feature-status audit (KNOW)

### LifeRE OS
**Live surface:** `https://lumin-web-production-e3a9.up.railway.app/api/v1/lifere` — mounted and responding.

**Working right now (tested on `dd2c792d6564`):**
- `/health` returns all 12 pillars (`daily_command_center`, `top_3_priorities`, `nightly_debrief`, `contextual_education`, `sales_coaching`, `social_media_os_lite`, `follow_up_os_lite`, `tc_document_extraction_lite`, `compliance_guardrails`, `recruiting_lite`, `finance_lite`, `lifeos_accountability`).
- `/education/curriculum` returns a 10-module adaptive curriculum with `type` (`tab`, `drill`, `sales_sim`) and `level` (`new`, `building`, `scaling`).
- `/top-3` returns prioritized MIT list for the day.
- `/alpha/readiness` reports `TECHNICAL_PASS`, `agent_alpha_pass: true`, `live_pg: true`, `ui_markers` all `present: true`.
- `npm run lifeos:lifere-os:v1-acceptance` passes 19/19 locally.

**Not working / not done:**
- `founder_usability_pass: false` — no non-engineer has completed the daily cycle end-to-end.
- `/boldtrail/status` and `/boldtrail/pipeline` return synthetic data because `BOLDTRAIL_*` credentials are not configured.
- No Stripe checkout for a paid LifeRE tier.
- The adaptive learning-style branching (`visual`, `auditory`, `reading/writing`, `kinesthetic`) is wired into `services/lifere-council-router.js` and `db/migrations/20260730_lifere_learning_profile.sql`, but it has not been founder-tested.
- Real call/voice, MLS deal scanning, and TC document extraction are stubs or limited without Twilio/Replicate/MLS credentials.

### TC Service
**Live surface (updated 2026-07-30):** `https://lumin-web-production-e3a9.up.railway.app/api/v1/tc` is now mounted and `GET /api/v1/tc/intake/workspace` returns a real workspace with 1 active transaction. `npm run deploy:truth:audit` PROVEN on `9b6f85068ed1` with `runtime_profile: full`.

**What is reachable now:**
- `/api/v1/tc/status` public health.
- `/api/v1/tc/intake/workspace` and `/api/v1/tc/intake/transaction`.
- Document QA, offer prep, approval cockpit, alert escalation, MLS deal scanner, GLVAR dues/violations, Asana sync, email IMAP intake, and browser-automation routes (source in `routes/tc-routes.js`).

**Credential readiness from live workspace:**
- IMAP (`TC_IMAP_*`) — configured and reachable.
- GLVAR (`GLVAR_mls_*`) — username present, password present.
- SkySlope/eXp Okta (`exp_okta_Username`) — username present, **password missing** (`exp_okta_Password` not set).
- Asana — missing `ASANA_ACCESS_TOKEN` + `ASANA_TC_PROJECT_GID`.
- Agent phone / webhook secrets (`TC_AGENT_PHONE`, `EMAIL_WEBHOOK_SECRET`, `TWILIO_WEBHOOK_SECRET`) — not set.

**What exists in code (from `routes/tc-routes.js` + `routes/tc-intake-routes.js` + `routes/tc-billing-routes.js` + `routes/tc-imap-routes.js` + `routes/tc-r4r-routes.js`):**
- Transaction intake: `GET /api/v1/tc/intake/workspace`, `POST /api/v1/tc/intake/transaction`.
- Document intake/validation: `POST /api/v1/tc/documents/upload`, `POST /api/v1/tc/documents/validate`, `GET /api/v1/tc/documents/:id/status`.
- Inspection workflow: `POST /api/v1/tc/inspections`, `GET /api/v1/tc/inspections/:id`, `POST /api/v1/tc/inspections/:id/forward`.
- Offer prep: `POST /api/v1/tc/offers/prepare`.
- Approval cockpit: `GET /api/v1/tc/approvals`, `POST /api/v1/tc/approvals/:id/{approve,reject,snooze}`.
- Alert escalation: `GET /api/v1/tc/alerts`, `POST /api/v1/tc/alerts/:id/acknowledge`.
- Portal: `GET /api/v1/tc/portal/agent`, `GET /api/v1/tc/portal/client/:token`.
- Reports: `GET /api/v1/tc/reports/morning-digest`, `GET /api/v1/tc/reports/weekly-seller`.
- GLVAR dues/violations: `GET /api/v1/tc/glvar/dues`, `GET /api/v1/tc/glvar/violations`.
- MLS deal scanner: `POST /api/v1/tc/mls/deals`.
- Asana sync: `POST /api/v1/tc/asana/sync`.
- Email IMAP intake: `GET /api/v1/tc/imap/mailboxes`, `POST /api/v1/tc/imap/scan`.
- Repair-request classification: `POST /api/v1/tc-r4r/scan` (mounted at `/api/v1/tc-r4r`).
- Browser-automation jobs: SkySlope upload, TransactionDesk party sync, eXp Okta SSO.

**All of those are now reachable in production** once the missing credentials above are supplied; the router is mounted and the workspace returns real data.

**Missing credentials needed for TC:**
- `TC_IMAP_*` (Gmail/Outlook IMAP for document intake).
- `EXP_OKTA_*` or `SKYSLOPE_*` for SkySlope automation.
- `BOLDTRAIL_*` for CRM sync.
- `GLVAR_*` for dues/violation scraping.
- `MLS_*` or `PARAGON_*` for MLS deal scanner.
- `ASANA_ACCESS_TOKEN` + workspace.
- `TWILIO_*` for SMS/call alerts.

### Human-only blocker list
1. **Email provider decision + API key** — needed for SMOS password-reset, Site Builder prospect follow-up, TC email intake, outreach.
2. **Verified sending domain** — for any outbound email.
3. **One real $49 SMOS card charge** — to prove money moves and unlock works.
4. **One real LifeOS paid tier charge** (`core` $19 / `premium` $49 / `family` $99) — to prove `/api/v1/lifeos/auth/billing` end-to-end.
5. ~~**Railway env decision to enable full runtime**~~ — **DONE 2026-07-30.** Production is now `runtime_profile: full`; TC routes are mounted.
6. **TC / MLS / BoldTrail / ClientCare / Twilio credentials** — required for TC field-ops to do real work.
7. **Founder usability walkthrough for LifeRE** — non-engineer completes the daily command center, top-3, debrief, and one coaching drill in the LifeOS app.
8. **Which paid LifeOS / LifeRE feature to launch first** — so we can price, build checkout, and run SENTRY.
9. **Stripe payout / account configuration** — to move the $45 already in Stripe.

