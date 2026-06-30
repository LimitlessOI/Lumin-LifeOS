<!-- SYNOPSIS: Site Builder Lane Operator Runbook -->

# Site Builder Lane Operator Runbook

This runbook outlines the essential procedures for operating and monitoring the Site Builder lane, covering prerequisites, daily checks, live smoke testing, critical failure conditions, and the end-to-end first-customer path.

## Preconditions

Before operating the Site Builder lane, ensure the following environment variables are correctly configured in the Railway environment:

*   `SITE_BASE_URL`: The base URL for generated preview links and the tracking pixel (e.g., `https://yourdomain.com`).
*   `COMMAND_CENTER_KEY`: The API key for authenticating requests to the `/api/v1/sites` endpoints.
*   `EMAIL_FROM`: The sender email address for cold outreach (e.g., `outreach@yourdomain.com`).
*   `POSTMARK_SERVER_TOKEN`: The Postmark API key required for sending cold emails.
*   `POSTMARK_WEBHOOK_TOKEN` (Optional): Secret token for verifying Postmark inbound webhooks for reply tracking.
*   `SLACK_WEBHOOK_URL` (Optional): For warm lead alerts (viewed/replied events).

All database tables (`prospect_sites`, `email_suppressions`, `outreach_log`) are confirmed to be present and operational in Neon production.

## Daily Checks

Perform these checks daily to ensure pipeline health and identify immediate actions:

1.  **Pipeline Report**: Run `npm run site-builder:report` to get a summary of the pipeline funnel, conversion rates, and warm leads.
2.  **Warm Leads**: Review the "Warm Leads" section of the pipeline report. Prioritize manual follow-ups for prospects marked `viewed` or `replied`.
3.  **Follow-Up Cron**: Ensure the `scripts/site-builder-follow-up-cron.mjs` script is running as scheduled (e.g., daily) to send automated day-3/day-7 follow-ups.
4.  **QA Hold Review**: Check the Command Center for any prospects in `qa_hold` status. These require manual review and potential repair before they can be sent.

## Live Smoke Test

The live smoke test verifies the core site building functionality on the deployed Railway instance.

**Command:**
`npm run site-builder:live-smoke`
or
`node scripts/site-builder-live-smoke.mjs`

**Expected Output (JSON):**
A successful run will output JSON similar to this, indicating `ok: true`, a `previewUrl`, and a `qualityReport` with `readyToSend: true` (or `false` if the generated site quality is low, but the report itself must be present).

```json
{
  "ok": true,
  "status": 200,
  "previewUrl": "https://...",
  "scorePct": 85,
  "grade": "A",
  "readyToSend": true,
  "recommendedAction": "..."
}
```

**Failure Conditions (Red):**
*   The script exits with an error (`ok: false`).
*   The response is not valid JSON.
*   `previewUrl` is missing from the response.
*   `qualityReport` is missing from the response.

## Red Conditions (Launch-Blocking)

These conditions indicate a critical failure preventing the core functionality of the Site Builder lane and require immediate attention:

*   **Live Smoke Test Failure**: The `site-builder-live-smoke.mjs` script fails to build a preview site or does not return a valid `qualityReport`.
*   **Missing Environment Variables**: Any of `SITE_BASE_URL`, `COMMAND_CENTER_KEY`, `EMAIL_FROM`, or `POSTMARK_SERVER_TOKEN` are missing or invalid.
*   **API Endpoint Failures**: The `/api/v1/sites/build` or `/api/v1/sites/prospect` endpoints consistently return errors (e.g., 500s, malformed responses).
*   **Email Sending Failure**: Cold emails are not being sent, or Postmark reports consistent delivery failures.
*   **Quality Gate Failure**: Generated sites consistently result in `qualityReport.readyToSend === false`, preventing automated outreach.
*   **Command Center Unresponsive**: The `public/overlay/site-builder-command-center.html` dashboard fails to load or display pipeline data.

## First-Customer Path

This outlines the end-to-end flow for a prospect through the Site Builder pipeline:

1.  **Prospect Discovery**:
    *   Identify potential wellness businesses using `npm run site-builder:discover --city='Austin, TX' --type=yoga`.
    *   This generates a JSON array of businesses.

2.  **Prospect Ranking**:
    *   Prioritize discovered prospects by opportunity score using `npm run site-builder:rank --input=discovered.json --top=10`.
    *   This ranks prospects, flags chains/SPAs, and helps select the best targets.

3.  **Site Build & Outreach**:
    *   Initiate the build and outreach process for a prospect via the Command Center or directly using the API:
        `POST /api/v1/sites/prospect { businessUrl, contactEmail, contactName }`
    *   **Process**: The system scores the prospect's existing site (opportunity score), builds a modern preview site, generates a personalized cold email, and attempts to send it.
    *   **Quality Gate**: If the generated site's `qualityReport.readyToSend` is `false`, the prospect's status will be set to `qa_hold`, and the email will *not* be sent automatically. Manual review is required.

4.  **Tracking & Alerts**:
    *   **Viewed**: When the prospect opens the preview site, the injected tracking pixel fires, automatically updating the prospect's status to `viewed`. A Slack alert (if `SLACK_WEBHOOK_URL` is configured) is sent.
    *   **Replied**: If the prospect replies to the cold email, the Postmark inbound webhook automatically updates their status to `replied`. A Slack alert is sent.

5.  **Follow-Up**:
    *   **Automated**: The `scripts/site-builder-follow-up-cron.mjs` script runs periodically to send day-3/day-7 follow-up emails to eligible prospects.
    *   **Manual**: Operators can send manual follow-ups via the Command Center or `POST /api/v1/sites/follow-up`.

6.  **Conversion**:
    *   Once a prospect converts, their status is manually updated to `converted` via the Command Center or `PATCH /api/v1/sites/prospects/:clientId/status`. This also records the `deal_value`.

7.  **Preview Expiry**:
    *   The `scripts/site-builder-preview-expiry-cron.mjs` script runs periodically to expire unsold preview sites after 30 days, setting their status to `expired`.