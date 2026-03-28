# AMENDMENT 08 — Outreach Automation & CRM
**Status:** LIVE (partial)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
Automated multi-channel outreach (email, SMS, call) with a lightweight CRM for tracking prospects and clients. Includes sequence management (drip campaigns), consent enforcement (fail-closed on missing consent), and BoldTrail real estate CRM integration. Powers the prospect follow-up for the Site Builder pipeline.

**Mission:** Reach the right people at the right time through the right channel — with consent, always.

---

## REVENUE MODEL
| Revenue Stream | Amount | Notes |
|---------------|--------|-------|
| Outreach-as-a-service for wellness businesses | $297–$597/mo | Managed outreach campaigns |
| Site builder prospect pipeline (feeds from) | $997+ per close | Cold email converts to site sale |
| Real estate agent outreach (BoldTrail) | Per agent contract | Agent recruitment + follow-up |

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `core/outreach-automation.js` | Core: email, SMS, call, campaign management |
| `core/crm-sequence-runner.js` | Drip sequence execution |
| `core/notification-service.js` | Notification dispatch layer |
| `routes/outreach.js` | Outreach API endpoints |
| `integrations/boldtrail.js` | BoldTrail real estate CRM sync |
| `services/autonomy-scheduler.js` | Background: auto-response, showing reminders |
| `server.js` (lines 9855–10032, 6155–6572) | Outreach + BoldTrail endpoints — PARTIALLY EXTRACTED |

### DB Tables
| Table | Purpose |
|-------|---------|
| `crm_contacts` | All contacts with consent flags |
| `crm_sequences` | Drip sequence definitions |
| `crm_sequence_enrollments` | Contact → sequence enrollment |
| `crm_messages` | All sent messages log |
| `crm_replies` | Inbound replies |
| `email_events` | Email open/click/bounce tracking |
| `email_suppressions` | Do-not-contact list |
| `outbound_consent` | Explicit consent records (REQUIRED before any outreach) |
| `prospect_sites` | Site builder prospects (from Amendment 05) |

### Consent Model (Fail-Closed)
1. Before ANY outbound message: check `outbound_consent` table
2. `consent_email = true` required for email
3. `consent_sms = true` required for SMS/call
4. Quiet hours enforced (UTC start/end)
5. If consent missing → block message → log attempt → return error

### Required Env Vars
- `TWILIO_ACCOUNT_SID` — Twilio SMS/calls
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE` — outbound phone number
- Email service: `POSTMARK_API_KEY` OR `SENDGRID_API_KEY`

---

## CURRENT STATE
- **KNOW:** `core/outreach-automation.js` implements consent gating
- **KNOW:** `core/crm-sequence-runner.js` exists
- **KNOW:** BoldTrail integration routes exist at lines 6155–6572 in server.js
- **KNOW:** `services/autonomy-scheduler.js` syntax errors were fixed (missing `)` in SQL params)
- **THINK:** Email sending falls back to logging only if no notification service configured
- **DON'T KNOW:** Whether Postmark/SendGrid is configured in Railway env
- **DON'T KNOW:** Whether BoldTrail API credentials are active

---

## REFACTOR PLAN
1. Extract BoldTrail endpoints (6155–6572) → `routes/boldtrail-routes.js`
2. Move remaining outreach endpoints from server.js → `routes/outreach.js` (already exists, verify completeness)
3. Add email service configuration check at startup — warn if no email provider configured
4. Add consent import tool — batch upload consent records from CSV
5. Wire follow-up sequences for Site Builder pipeline (auto day-3, day-7 follow-ups)

---

## NON-NEGOTIABLES (this project)
- **ZERO outreach without explicit consent record in DB** — this is non-negotiable (GDPR, CAN-SPAM, UEP)
- Unsubscribe/opt-out must work within one click and take effect immediately
- No outreach during quiet hours — enforce UTC-based quiet hours
- Bounced/complained emails must auto-add to suppression list
- Never send more than 3 follow-up emails per prospect in any 30-day window
- All sent messages logged to `crm_messages` — full audit trail required

---

## Pre-Build Readiness

**Status:** NOT_READY
**Adaptability Score:** 74/100
**Last Updated:** 2026-03-27

### Gate 1 — Implementation Detail
- [x] Consent model fully documented — fail-closed, 5-step gate before any outbound message
- [x] DB schema complete — 9 tables covering contacts, sequences, messages, consent, suppression
- [x] Required env vars listed (Twilio, Postmark/SendGrid)
- [ ] BoldTrail endpoints (server.js lines 6155–6572) not yet extracted to `routes/boldtrail-routes.js`
- [ ] Day-3 and day-7 auto follow-up cron for Site Builder not yet built — documented as next refactor task
- [ ] Email service startup check not yet built — server starts successfully even with no email provider configured
- [ ] Consent import tool (batch CSV upload) not yet specified to implementation level

### Gate 2 — Competitor Landscape
| Competitor | Strengths | Weaknesses | Our Edge |
|---|---|---|---|
| Mailchimp | Industry-leading email, huge template library, brand trust | No SMS, no calls, no CRM sequences, no real estate integration, no AI personalization | We are multi-channel (email + SMS + call) with AI-personalized content and consent gating in one system |
| ActiveCampaign | Strong automation sequences, CRM + email | Expensive ($149+/mo), complex setup, no real estate-specific workflows | Our sequences are AI-generated per-prospect based on scraped context, not template drip campaigns |
| BoldTrail (kvCORE) | Purpose-built for real estate agents, strong market share | Email-only outreach, no wellness/multi-vertical, $500+/mo | We integrate BoldTrail as a data source while adding SMS, calls, and multi-vertical prospect pipelines |
| Instantly.ai | Cold email at scale, good deliverability tooling | Email-only, no CRM, no consent tracking, legally risky (CAN-SPAM edge cases) | Our consent-first model is the legal moat — Instantly users are one lawsuit away from a problem |

### Gate 3 — Future Risks
| Risk | Probability | Impact | Position |
|---|---|---|---|
| CAN-SPAM or TCPA enforcement action against cold email/SMS campaigns | Medium | HIGH — fines up to $1,500/SMS under TCPA | Mitigate: `outbound_consent` table is the technical control; 3-email cap is already in non-negotiables; document consent acquisition path for every use case |
| Twilio price increase or account suspension for flagged outreach | Medium | High — SMS/calls disabled | Mitigate: design for provider swap; abstract Twilio behind `services/sms-service.js` so Vonage/Bandwidth can replace it |
| Email deliverability collapses (Gmail blocks our domain) | Medium | High — all cold email pipeline broken | Mitigate: separate sending domain from main domain; warm the domain; monitor bounce rate; SPF/DKIM/DMARC required before launch |
| BoldTrail API changes or access revoked | Low | Medium — real estate outreach loses data sync | Monitor: keep BoldTrail integration as import layer, not primary data store |

### Gate 4 — Adaptability Strategy
Channel providers (Twilio, Postmark, SendGrid) are referenced only in notification service — swapping providers is a config change. If a new channel (WhatsApp, iMessage business) becomes viable, we add a `consent_whatsapp` column to `outbound_consent` and a new provider adapter — no sequence logic changes. The drip sequence engine is data-driven (DB rows), so adding a new sequence type requires a DB row, not a code change. Score: 74/100 — consent model and sequence engine are well-designed; BoldTrail extraction and email startup validation are the open gaps.

### Gate 5 — How We Beat Them
Every outreach tool requires the user to build lists and design sequences manually; LifeOS generates the prospect list from a Google Maps search, writes AI-personalized outreach based on the prospect's scraped website, enforces consent at the DB layer, and self-sequences follow-ups — the only human input is a business category and a city.
