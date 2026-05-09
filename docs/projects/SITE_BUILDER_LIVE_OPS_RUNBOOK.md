# Site Builder Lane Operator Runbook

This runbook outlines the essential procedures for operating and monitoring the Site Builder lane, covering setup, daily checks, troubleshooting, and the full prospect pipeline flow.

## Preconditions

Before operating the Site Builder lane, ensure the following environment variables are correctly configured in the Railway environment:

### Required for Core Functionality
-   `PUBLIC_BASE_URL` (or `BUILDER_BASE_URL`, `SITE_BASE_URL`, `LUMIN_SMOKE_BASE_URL`): Base URL for the Site Builder API and generated preview links.
-   `COMMAND_CENTER_KEY` (or `COMMAND_KEY`, `LIFEOS_KEY`, `API_KEY`): API key for authenticating requests to the Site Builder API.
-   `DATABASE_URL`: Connection string for the PostgreSQL database.

### Required for Email Outreach
-   `EMAIL_FROM`: The sender email address for cold outreach.
-   `POSTMARK_SERVER_TOKEN`: Postmark API key for sending cold emails.

### Optional for Enhanced Operations
-   `POSTMARK_WEBHOOK_TOKEN`: Secret token to verify Postmark inbound webhooks for reply tracking.
-   `SLACK_WEBHOOK_URL`: Slack incoming webhook URL for warm lead alerts (viewed/replied).
-   `AFFILIATE_JANE_APP_URL`: Jane App referral link for commission tracking.
-   `AFFILIATE_MINDBODY_URL`: Mindbody referral link for commission tracking.
-   `AFFILIATE_SQUARE_URL`: Square referral link for commission tracking.

## Daily Checks

Perform these checks daily to ensure the pipeline is healthy and progressing:

1.  **Pipeline Health Report:**
    Run the pipeline report to get an overview of funnel stages, conversion rates, and warm leads.
    ```bash
    npm run site-builder:report
    # or
    node scripts/site-builder-pipeline-report.mjs
    ```
    Review the output for any `Next action:` suggestions or critical issues.

2.  **Follow-Up Cron:**
    Ensure the automated follow-up cron is running or manually trigger it for eligible prospects.
    ```bash
    node scripts/site-builder-follow-up-cron.mjs
    ```
    This script sends day-3/day-7 follow-up emails to prospects in `sent` or `viewed` status.

3.  **Preview Expiry Cron:**
    Ensure the preview expiry cron is running or manually trigger it to expire unsold previews after 30 days.
    ```bash
    node scripts/site-builder-preview-expiry-cron.mjs
    ```

## Live Smoke Test

The live smoke test verifies the core site building functionality on the deployed Railway environment.

**Command:**
```bash
npm run site-builder:live-smoke
# or
node scripts/site-builder-live-smoke.mjs
```

**Success Criteria:**
The script should output `ok: true` and include a `previewUrl` and a `qualityReport` with `readyToSend` status. A successful run indicates that the `/api/v1/sites/build` endpoint is operational and can generate a preview site with a quality assessment.

**Failure Indication:**
Any output other than the success criteria, including `ok: false`, missing `previewUrl`, or missing `qualityReport`, indicates a critical issue with the site generation process.

## Command Center Usage

The Site Builder Command Center (`public/overlay/site-builder-command-center.html`) is the primary operator dashboard for managing the pipeline:

-   **Analyze Prospects:** View opportunity scores and pain points for existing sites.
-   **Build & Send:** Manually trigger site builds and send personalized cold outreach emails.
-   **Pipeline Table:** Monitor the status of all prospects (`built`, `sent`, `viewed`, `replied`, `converted`, `qa_hold`, `lost`, `expired`).
-   **Update Status:** Manually update prospect statuses (e.g., `converted`, `lost`) and `deal_value` for individual prospects.

## Red Conditions

### Launch-Blocking Red (Requires Immediate Attention)

These conditions indicate a critical failure that prevents the core functionality of the Site Builder lane and must be resolved before proceeding with outreach or new prospect processing:

-   **Live Smoke Test Failure:** `npm run site-builder:live-smoke` fails to produce a valid `previewUrl` and `qualityReport`. This indicates the core `/api/v1/sites/build` endpoint is non-functional.
-   **Missing Required Environment Variables:** Any of `PUBLIC_BASE_URL`, `COMMAND_CENTER_KEY`, `DATABASE_URL`, `EMAIL_FROM`, or `POSTMARK_SERVER_TOKEN` are not set or are invalid.
-   **Database Connectivity Issues:** The application cannot connect to or query the `prospect_sites`, `email_suppressions`, or `outreach_log` tables.
-   **Consistent `qa_hold` for all Builds:** If all generated sites consistently land in `qa_hold` with `qualityReport.readyToSend === false`, it suggests a systemic issue with the AI site generation or quality scoring, preventing any outreach.
-   **Email Sending Failures:** Cold emails are consistently failing to send, indicating an issue with Postmark integration or `EMAIL_FROM` configuration.

### Operator-Only Setup / Non-Blocking

These conditions are operational concerns that do not block the core functionality but require operator action or indicate an early stage in the pipeline:

-   **Missing Optional Environment Variables:** `SLACK_WEBHOOK_URL`, `POSTMARK_WEBHOOK_TOKEN`, or affiliate URLs are not configured. This impacts enhanced features (e.g., warm lead alerts) but not core build/send.
-   **No Warm Leads:** The pipeline report shows no prospects in `viewed` or `replied` status. This is normal for a new pipeline or if outreach has just begun.
-   **Individual `qa_hold` Sites:** Some generated sites landing in `qa_hold` is expected. These require manual review and potential repair before sending.
-   **Cron Jobs Not Automated:** If `site-builder-follow-up-cron.mjs` or `site-builder-preview-expiry-cron.mjs` are not yet set up as automated cron jobs, they can be run manually as part of daily checks.

## First-Customer Path

This outlines the end-to-end process for acquiring and converting a prospect using the Site Builder lane:

1.  **Prospect Discovery:**
    Identify potential wellness businesses in a target city using the discovery script.
    ```bash
    npm run site-builder:discover --city='Austin, TX' --type=yoga > discovered.json
    ```

2.  **Prospect Ranking:**
    Batch-score discovered prospects to prioritize outreach based on opportunity score.
    ```bash
    npm run site-builder:rank --input=discovered.json --top=10 > ranked.json
    ```

3.  **Site Build & Initial Outreach:**
    For a ranked prospect, trigger the site build, opportunity scoring, AI email generation, and initial cold email send.
    ```bash
    POST /api/v1/sites/prospect { businessUrl, contactEmail, contactName, businessName, industry }
    ```
    This step scores the prospect's existing site, builds a preview, sends a personalized cold email with the preview link, and records the prospect in the database. If `qualityReport.readyToSend === false`, the prospect status will be `qa_hold` and no email will be sent.

4.  **Prospect Views Preview:**
    When the prospect opens the preview site, the injected tracking pixel fires, automatically updating their status to `viewed` in the database. A Slack alert may be sent if `SLACK_WEBHOOK_URL` is configured.

5.  **Prospect Replies:**
    If the prospect replies to the cold email, the Postmark inbound webhook automatically updates their status to `replied` in the database. A Slack alert may be sent if `SLACK_WEBHOOK_URL` is configured.

6.  **Follow-Up:**
    The automated follow-up cron (`scripts/site-builder-follow-up-cron.mjs`) sends day-3 and day-7 follow-up emails to eligible prospects who have not yet replied or converted.

7.  **Conversion:**
    Upon successful conversion (e.g., prospect purchases a site build), manually update the prospect's status and deal value via the API or Command Center.
    ```bash
    PATCH /api/v1/sites/prospects/:clientId/status { status: 'converted', deal_value: 997 }
    ```