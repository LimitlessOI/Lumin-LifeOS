<!-- SYNOPSIS: Market-readiness audit and implementation plan for every active product. -->
<!-- @ssot docs/products/INDEX.md -->

# Market Readiness Plan — All Products

**Date:** 2026-07-29  
**Live deploy tip:** `d3042dbfd134` (`https://lumin-web-production-e3a9.up.railway.app`)  
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

- **1 product is closest to market ready:** SocialMediaOS pack sales (`marketingos/socialmediaos`).
- **1 product is technically live but not conversion-proven:** Site Builder.
- **Several products are code-complete on technical acceptance but `founder_usability_pass: false`:** LifeOS commitments/inbox, LifeRE, BuilderOS internals.
- **Several products are partial code or missing credentials:** ClientCare Billing Recovery, Video Pipeline, Outreach CRM, AI Receptionist.
- **Many products are still vision documents** and need a `FOUNDER_PACKET` + `BLUEPRINT.json` before implementation.

The single biggest cross-cutting blocker is **email delivery**: Postmark was canceled, and `NotificationService`, `password-reset-email.js`, `site-builder-prospect-runner.js`, `tc-email-document-service.js`, and `tc-email-monitor.js` all depend on it. A new email provider must be chosen, configured, and every mail path re-proved before any customer-facing product is truly market ready.

---

## Product-by-product audit

| Product | Status | Market-ready? | Blocking gap | Next action (owner) | Size |
|---|---|---|---|---|---|
| **SocialMediaOS** | Soft-launch ready, 90% | NO — external email + real card charge unproved | Postmark canceled; no `RESEND_API_KEY`; live $49 charge not completed | 1. Pick new email provider + add key to Railway. 2. Complete a live $49 checkout and `pack/verify`. 3. Re-prove forgot-password to a real inbox. | Small |
| **Site Builder** | Live, SENTRY Layer A PASS, checkout works | NO — SENTRY Layer B / real conversion unproved | SENTRY composite Layer B failed; no real customer walkthrough; Postmark-dependent follow-up | 1. Run `node scripts/sentry-prealpha-gate.mjs site-builder` and fix Layer B. 2. Replace Postmark with new provider. 3. Founder completes one real preview → purchase. | Small-Medium |
| **LifeOS founder UI** | SENTRY PASS, new layout live | NO — no paid product or conversion path | No packaged offer or checkout tied to the UI | 1. Pick first paid LifeOS feature (e.g., commitments premium). 2. Add Stripe price + checkout. 3. SENTRY re-prove paid flow. | Medium |
| **LifeRE OS** | Technical PASS, runtime active | NO — `founder_usability_pass: false`, no money proof | Founder has not completed daily cycle end-to-end; no paid tier checkout | 1. Founder uses `/lifeos-app.html?mode=lifere` for 3 days. 2. Fix UX friction. 3. Add Stripe checkout for LifeRE Pro. | Medium |
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
**KNOW:** `lifeos-founder-ui` Layer A+B PASS. `marketingos` Layer A+B PASS on current tip. `site-builder` Layer A PASS but composite Layer B failed (stale feed `SENTRY_FINDINGS_FEED.site-builder.json`).

**Fix:**
1. Re-run `node scripts/sentry-prealpha-gate.mjs site-builder` on current tip.
2. Fix first failing assertion.
3. Re-run until `findings_count: 0`.

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

### Phase 3 — Re-prove Site Builder (Days 3–5)
- [ ] Re-run SENTRY site-builder Layer A+B
- [ ] Fix Layer B findings
- [ ] Run one real preview → purchase flow
- [ ] Update site-builder product home + receipt

### Phase 4 — Package LifeOS / LifeRE paid tiers (Days 5–10)
- [ ] Choose first paid LifeOS feature
- [ ] Add Stripe price + checkout
- [ ] Founder usability pass
- [ ] SENTRY re-prove

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
- **KNOW:** Postmark removal blocks email for SMOS, Site Builder, TC, and outreach.
- **KNOW:** SENTRY `marketingos` and `lifeos-founder-ui` pass; `site-builder` Layer B needs re-run.
- **THINK:** Resend is the best drop-in replacement for both transactional and creator cold email.
- **DON'T KNOW:** Whether the Stripe account has payouts configured, whether a real card charge will succeed, or the exact balance of AI provider credits.
- **DON'T KNOW:** Which paid feature Adam wants to launch first for LifeOS.
