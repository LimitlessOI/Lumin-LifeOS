### Shipped controls

*   **Discover Prospects**: Initiate prospect discovery by city and niche (`POST /api/v1/sites/discover`, `npm run site-builder:discover`).
*   **Analyze Existing Site**: Get an opportunity score and pain points for a prospect's existing site (`POST /api/v1/sites/analyze`).
*   **Build & Send Outreach**: Build a preview site, score it, and send a personalized cold email (`POST /api/v1/sites/prospect`).
*   **Bulk Prospecting**: Process up to 20 prospects in a batch (`POST /api/v1/sites/bulk-prospect`).
*   **List Previews**: Retrieve a list of all built preview sites (`GET /api/v1/sites/previews`).
*   **View CRM Pipeline**: Access a list of prospects with their current status (`GET /api/v1/sites/prospects`).
*   **View Pipeline Dashboard**: Get aggregated pipeline statistics including total revenue (`GET /api/v1/sites/dashboard`).
*   **Update Prospect Status**: Manually update a prospect's status and deal value (`PATCH /api/v1/sites/prospects/:clientId/status`).
*   **Track Preview Views**: Automatically mark a prospect as 'viewed' when their preview site is opened (via injected pixel calling `GET ⟦P42⟧`).
*   **Track Replies**: Automatically mark a prospect as 'replied' when they respond to a cold email (via Postmark webhook calling `POST ⟦P44⟧`).
*   **Run Follow-Up Cron**: Execute automated day-3/day-7 follow-ups (`scripts/site-builder-follow-up-cron.mjs`).
*   **Run Preview Expiry Cron**: Expire unsold previews after 30 days (`scripts/site-builder-preview-expiry-cron.mjs`).
*   **Generate Pipeline Report**: View live pipeline analytics (`scripts/site-builder-pipeline-report.mjs`).
*   **Check Launch Readiness**: Verify system health and identify blockers (`GET /api/v1/sites/launch-readiness`).

### Route dependencies

The `public/overlay/site-builder-command-center.html` (Command Center) is assumed to depend on the following API endpoints for its functionality:

*   `/api/v1/sites/dashboard` for displaying overall pipeline metrics.
*   `/api/v1/sites/prospects` for populating the main prospect table/list.
*   `/api/v1/sites/discover` for initiating new prospect searches.
*   `/api/v1/sites/analyze` for on-demand analysis of a single URL.
*   `/api/v1/sites/prospect` for manually triggering a build and send for a single prospect.
*   `/api/v1/sites/previews` for displaying a list of generated preview sites.
*   `/api/v1/sites/prospects/:clientId/status` for updating individual prospect records.
*   `/api/v1/sites/launch-readiness` for displaying system health status.
*   **Implicit**: A route for viewing individual prospect details (e.g., `/api/v1/sites/prospects/:clientId`) is highly likely to be a dependency for any detailed view in the Command Center.
*   **Implicit**: A route for manually sending a follow-up email to a specific prospect (e.g., `POST ⟦P40⟧`) would be expected for operator control.
*   **Implicit**: A route for listing POS commission partners (e.g., `GET ⟦P41⟧`) would be needed if the Command Center allows selection or display of these.
*   **Implicit**: The Command Center would need to know the paths for the tracking pixel (`GET ⟦P42⟧`) and Postmark webhook (`POST ⟦P44⟧`) to configure external systems or display relevant information.

### Risks

*   **Incomplete Operator Control**: Key operator actions like manual follow-up (`POST ⟦P40⟧`) and viewing POS partner lists (`GET ⟦P41⟧`) are not yet exposed via dedicated API endpoints, limiting the Command Center's direct control.
*   **Missing Detail View**: The absence of a `GET /api/v1/sites/prospects/:clientId` endpoint means the Command Center cannot display comprehensive details for a single prospect, including their full `metadata` and `qualityReport`.
*   **Undefined External Integration Paths**: The specific paths for the tracking pixel (`GET ⟦P42⟧`) and Postmark webhook (`POST ⟦P44⟧`) are placeholders, posing a risk if not clearly defined and secured, especially for the webhook token verification.
*   **Consent Tracking Enforcement**: While Rule 1 states "never email same address twice without consent," the API surface for `POST /prospect` and `POST /bulk-prospect` does not explicitly detail how `email_suppressions` are checked and enforced, which is a critical compliance risk.
*   **Quality Gate Enforcement**: The `POST /prospect` endpoint must strictly enforce the quality gate (`quality score < 70` → `status = 'qa_hold'`) as per Rule 4 to prevent sending weak previews. The current API surface doesn't explicitly confirm this enforcement.

### Next queue slices

1.  Implement `GET /api/v1/sites/prospects/:clientId` endpoint returning single prospect detail with full metadata + qualityReport.
2.  Implement `POST /api/v1/sites/prospects/:clientId/follow-up` (P40) to allow operators to manually send follow-up emails.
3.  Implement `GET /api/v1/sites/pos-partners` (P41) to retrieve the list of POS commission partners.
4.  Define and implement `GET /api/v1/sites/track-view` (P42) with `clientId` (P43) query parameter for the tracking pixel.
5.  Define and implement `POST /api/v1/sites/postmark-webhook` (P44) for inbound email replies, including `POSTMARK_WEBHOOK_TOKEN` verification.
6.  Audit `POST /api/v1/sites/prospect` and `POST /api/v1/sites/bulk-prospect` to ensure strict enforcement of email consent (Rule 1) and the quality gate (Rule 4, P46, P47).