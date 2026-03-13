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
