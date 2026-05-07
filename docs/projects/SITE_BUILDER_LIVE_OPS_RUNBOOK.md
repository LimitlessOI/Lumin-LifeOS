# Site Builder Operator Runbook

## Preconditions

*   **Environment Variables:**
    *   `SITE_BASE_URL`: Base URL for preview links and tracking pixel.
    *   `EMAIL_FROM`: Sender email for cold outreach.
    *   `POSTMARK_SERVER_TOKEN`: Postmark API key for cold email sending.
    *   `COMMAND_CENTER_KEY`: API key for accessing Site Builder endpoints.
    *   `POSTMARK_WEBHOOK_TOKEN` (optional): Secret token to verify Postmark inbound webhook.
    *   `SLACK_WEBHOOK_URL` (optional): Slack incoming webhook for warm-lead alerts.
*   **External Systems:**
    *   Postmark account configured for email sending and inbound webhooks.
    *   Railway deployment running the Site Builder services.
    *   Google Places API access (for `scripts/site-builder-prospect-discovery.mjs`).

## Daily Checks

1.  **Pipeline Health Report:**
    *   Run `npm run site-builder:report` (or