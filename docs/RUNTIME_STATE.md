# Runtime State (Verified from Repo)
Last reviewed: 2026-02-02

This file is meant to be a quick “what is actually live vs stubbed” snapshot, grounded in repository evidence (not aspirations).

## Payments / Billing
- **Stripe automation** (products/prices/checkout + webhook verification): implemented and mounted.
  - Core: `core/stripe-automation.js`
  - Router: `routes/stripe-routes.js` mounted at `/api/stripe/*` in `server.js`
  - Webhook: `/api/stripe/webhook` in `server.js` calls `core/stripe-automation.js`
- **TCO Stripe flows** (checkout + Stripe webhook handler): implemented in `routes/tco-routes.js`

## Calling / SMS
- **Twilio**: helper functions exist in `server.js` (`getTwilioClient`, `sendSMS`, `makePhoneCall`) and TwiML endpoints exist (`/api/v1/phone/*`).
- **Vapi**: integration exists and is mounted:
  - Core: `core/vapi-integration.js`
  - Endpoints: `/api/v1/vapi/*` in `server.js`

## Outbound / Outreach
- **Outreach API endpoints** exist and call the `OutreachAutomation` engine:
  - `/api/v1/outreach/campaign`, `/api/v1/outreach/email`, `/api/v1/outreach/sms`, `/api/v1/outreach/call`, `/api/v1/outreach/social` in `server.js`
  - Engine: `core/outreach-automation.js`
- **Current limitation**: `OutreachAutomation.sendEmail()` and `postToSocial()` are stubbed (log + DB insert) and do not send via a real email/social provider yet.

## Self-programming / Auto-building
- **Self-programming handler** is implemented in `server.js` (`handleSelfProgramming()`), including codebase reader / dependency manager / migration generator hooks.
- **Auto-builder** exists (`core/auto-builder.js`) and is exposed via `/api/build/*`.
- **Gap**: runtime must enforce “fail-closed” quality gates (lint/security/tests) prior to any auto-deploy or irreversible action.
- **Known bug**: `core/validators.js` declares an async `getAcorn()` loader but does not call it; `validateJavaScript()` can silently skip syntax validation even though `acorn` is installed.

## Quality / Safety Modules Present (Not Yet Fully Enforced Everywhere)
- `core/code-linter.js`
- `core/code-validator.js`
- `core/security-scanner.js`
- `core/build-validator.js`
- `core/auto-test-generator.js`

