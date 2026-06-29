<!-- SYNOPSIS: Documentation — SITE BUILDER COMMAND CENTER AUDIT. -->

### Shipped controls

The `routes/site-builder-routes.js` file implements the following operator actions, enabling the Command Center to:

*   **Initiate Site Builds:**
    *   `POST /api/v1/sites/build`: Manually trigger a site build from a given URL.
    *   `POST /api/v1/sites/prospect`: Trigger the full prospect pipeline (opportunity score, site build, cold email send) for a single prospect.
    *   `POST /api/v1/sites/bulk-prospect`: Trigger the full prospect pipeline for a batch of up to 20 prospects.
*   **Prospect Analysis & Management:**
    *   `POST /api/v1/sites/analyze`: Score a prospect's existing website to determine outreach priority.
    *   `GET /api/v1/sites/previews`: List all generated preview sites.
    *   `GET /api/v1/sites/prospects`: Retrieve a list of all prospects in the CRM pipeline.
    *   `PATCH /api/v1/sites/prospects/:clientId/status`: Update a prospect's status (e.g., `converted`, `lost`, `qa_hold`) and `deal_value`.
    *   `POST /api/v1/sites/follow-up`: Manually send a follow-up email to a specific prospect.
*   **Pipeline Monitoring & System Health:**
    *   `GET /api/v1/sites/dashboard`: Retrieve aggregated pipeline statistics (total, built, sent, viewed, replied, converted, total revenue).
    *   `GET /api/v1/sites/launch-readiness`: Check the system's readiness for revenue generation, identifying missing environment variables or blockers.
    *   `GET /api/v1/sites/pos-partners`: List supported POS commission partners.
*   **Automated Tracking:**
    *   `GET /api/v1/sites/preview-view`: Automatically marks a prospect as 'viewed' when their preview site is opened (triggered by injected pixel).
    *   `POST /api/v1/sites/email-reply-webhook`: Automatically marks a prospect as 'replied' when they respond to a cold email (Postmark webhook).

### Route dependencies

The `public/overlay/site-builder-command-center.html` (Operator dashboard) would depend on the following routes to fulfill its described purpose ("analyze prospects, build & send, pipeline table"):

*   **Dashboard Overview:** `GET /api/v1/sites/dashboard`
*   **Prospect Table:** `GET /api/v1/sites/prospects`
*   **New Prospect Entry:** `POST /api/v1/sites/prospect`, `POST /api/v1/sites/bulk-prospect`
*   **Pre-pipeline Analysis:** `POST /api/v1/sites/analyze`
*   **Status Updates:** `PATCH /api/v1/sites/prospects/:clientId/status`
*   **Manual Follow-ups:** `POST /api/v1/sites/follow-up`
*   **Preview Links:** `GET /api/v1/sites/previews` (to retrieve a list of previews, likely for linking)
*   **System Configuration:** `GET /api/v1/sites/pos-partners`, `GET /api/v1/sites/launch-readiness`

### Risks

*   **Missing Amendment Document:** The `docs/products/site-builder/PRODUCT_HOME.md` file is referenced as the SSOT but was not found (`ENOENT`). This means the audit is based on an incomplete specification, risking misinterpretation of intended features or missing critical requirements.
*   **Lack of Single Prospect Detail Endpoint:** There is no `GET /api/v1/sites/prospects/:clientId` endpoint. This prevents operators from viewing detailed information for a single prospect, such as their full `metadata`, `qualityReport`, `opportunityReport`, or `outreach_log` entries, which is crucial for QA, troubleshooting, and personalized engagement.
*   **Limited QA Workflow for `qa_hold`:** While `PATCH /api/v1/sites/prospects/:clientId/status` allows changing a prospect's status out of `qa_hold`, there's no explicit API to trigger a *rebuild* or *repair* for a specific `clientId` if a site is in `qa_hold`. Operators would need to use generic build routes, potentially leading to manual data reconciliation.
*   **No Direct Email Send for QA-Approved Sites:** If a site is manually moved from `qa_hold` to `sent` status, there's no dedicated API to *just send the initial cold email* for that specific `clientId` without re-running the entire `/prospect` pipeline. The `/prospect` route has `skipEmail`, but no `sendOnlyEmail` option for existing prospects.
*   **Limited `outreach_log` Visibility:** The `outreach_log` table exists, but there is no API endpoint to query its contents, either generally or for a specific prospect. This limits an operator's ability to review communication history.

### Next queue slices

*   **Add Single Prospect Detail Endpoint:** Implement `GET /api/v1/sites/prospects/:clientId` to return comprehensive details for a specific prospect, including `metadata`, `qualityReport`, and `opportunityReport`. This directly addresses a critical gap for operator analysis and QA.
*   **Implement Targeted Email Send:** Add an endpoint or extend an existing one to allow operators to send the initial cold email for a prospect that has already been built (e.g., after manual QA approval from `qa_hold`).
*   **Expose Outreach Log:** Create an endpoint (e.g., `GET /api/v1/sites/prospects/:clientId/outreach-log`) to retrieve the communication history for a given prospect.
*   **Preview Site Video Embed:** (As per existing next approved tasks) Wire the `youtubeChannelId` from discovery into `site-builder.js` to embed the latest video on preview sites.
*   **A/B Email Subject Line Tracking:** (As per existing next approved tasks) Implement `variant` field tracking in `outreach_log` and associated reporting.