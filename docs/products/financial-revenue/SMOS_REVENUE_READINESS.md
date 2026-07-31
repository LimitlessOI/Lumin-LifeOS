<!-- SYNOPSIS: SMOS revenue readiness snapshot -- automatically updated by scripts/verify-smos-email-provider.mjs and scripts/verify-smos-live-charge.mjs -->
# SMOS Revenue Readiness

| Field | Value |
|---|---|
| **Generated** | 2026-07-31T07:08:18.225Z |
| **Overall** | NOT_READY |
| **Email provider** | BLOCKED (postmark) |
| **Live charge capability** | BLOCKED |

## Email provider verdict

```json
{
  "schema": "smos_email_provider_verify_v1",
  "at": "2026-07-31T07:08:18.198Z",
  "provider": "postmark",
  "configured": false,
  "from_address": null,
  "reason": "Missing env keys: EMAIL_FROM",
  "missing": [
    "EMAIL_FROM"
  ]
}
```

## Live charge verdict

```json
{
  "schema": "smos_live_charge_verify_v1",
  "at": "2026-07-31T07:08:18.225Z",
  "expected_amount_cents": 4900,
  "amount_cents": 4900,
  "amount_match": true,
  "stripe_secret_set": false,
  "stripe_publishable_set": false,
  "base_url_set": true,
  "configured": false,
  "reason": "Missing env keys: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY"
}
```

## Required founder credentials

- For email: `EMAIL_PROVIDER` (resend|postmark|smtp|disabled), `EMAIL_FROM`, and provider key:
  - resend → `RESEND_API_KEY`
  - postmark → `POSTMARK_SERVER_TOKEN`
  - smtp → `SMTP_USER` + `SMTP_PASS` (and optionally `SMTP_HOST`, `SMTP_PORT`)
- For the $49 SMOS pack: `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` must be set.

## Execution gate

This script does **not** send email or charge cards. A real $49 charge requires founder
explicit approval after this readiness report shows READY. Do not enable automated
charging until SENTRY Layer A+B has verified the checkout flow end-to-end.
