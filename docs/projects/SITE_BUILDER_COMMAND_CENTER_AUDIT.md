**Shipped controls**
*   **Build Site:** Operators can initiate a site build from a given URL (`POST /api/v1/sites/build`).
*   **Prospect & Outreach:** Operators can trigger the full prospect pipeline (opportunity score, site build, AI email send) for a single prospect (`POST /api/v1/sites/prospect`).
*   **Bulk Prospecting:** Operators can process up to 20 prospects in a single batch (`POST /api/v1/sites/bulk-prospect`).
*   **Opportunity Scoring:** Operators can analyze an existing business URL to get an opportunity score, grade, pain points, and flags (`POST /api/v1/sites/analyze`).
*   **List Previews:** Operators can retrieve a list of all built preview sites (`GET /api/v1/sites/previews`).
*   **Pipeline CRM View:** Operators can view a list of all prospects in the CRM pipeline (`GET /api/v1/sites/prospects`).
*   **Pipeline Dashboard Stats:** Operators can retrieve aggregated pipeline statistics (total, built, sent, viewed, replied, converted, total revenue) (`GET /api/v1/sites/dashboard`).
*   **Update Prospect Status:** Operators can manually update a prospect's status and deal value (`PATCH /api/v1/sites/prospects/:clientId/status`).
*   **Send Follow-up:** Operators can trigger a follow-up email for a specific prospect (`POST /api/v1/sites/follow-up`).
*   **List POS Partners:** Operators can retrieve a list of supported POS commission partners (`GET /api/v1/sites/pos-partners`).
*   **Automated Tracking Pixel:** Prospect views are automatically tracked and status updated to 'viewed' (`GET /api/v1/sites/preview-view`).
*   **Automated Reply Webhook:** Prospect replies are automatically tracked and status updated to 'replied' (`POST /api/v1/sites/email-reply-webhook`).

**Route dependencies**
The `public/overlay/site-builder-command-center.html` dashboard would depend on the following routes for its core functionality:
*   `GET /api/v1/sites/dashboard` (for pipeline overview)
*   `GET /api/v1/sites/prospects` (for the main prospect table/CRM view)
*   `POST /api/v1/sites/prospect` (to initiate new outreach)
*   `POST /api/v1/sites/bulk-prospect` (for batch operations)
*   `POST /api/v1/sites/analyze` (for on-demand opportunity scoring)
*   `PATCH /api/v1/sites/prospects/:clientId/status` (for manual status updates)
*   `POST /api/v1/sites/follow-up` (to send follow-ups)
*   `GET /api/v1/sites/previews` (to review built sites)
*   `GET /api/v1/sites/pos-partners` (if displaying partner options)

**Risks**
*   **Missing Amendment Document:** The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file is missing, which is the SSOT for this domain. This audit is therefore based on an incomplete specification, relying heavily on inferred context from the `routes/site-builder-routes.js` and general domain description.
*   **Limited Prospect Detail:** There is no dedicated route to fetch a single prospect's full details, including their `metadata`, `qualityReport`, and `outreach_log`. This means the command center cannot display comprehensive information for an individual prospect without making multiple, potentially complex, API calls or relying on the limited data returned by `/prospects`.
*   **QA Hold Workflow:** While `PATCH /prospects/:clientId/status` allows setting `qa_hold`, there's no explicit route to retrieve the `qualityReport` for a specific `clientId` to facilitate operator review and decision-making for sites in `qa_hold`.
*   **Manual Email Management:** The system supports automated cold emails and follow-ups, but lacks routes for operators to manually compose, edit, or send custom emails to prospects outside of the automated flow.
*   **Suppression Management:** There are no routes to manually manage the `email_suppressions` list, which could be necessary for compliance or specific operator actions.

**Next queue slices**
*   Add `GET /api/v1/sites/prospects/:clientId` endpoint returning single prospect detail with full metadata + qualityReport.
*   Add route to retrieve `outreach_log` entries for a specific `clientId`.
*   Add route(s) for manual management of `email_suppressions` (add/remove).
*   Consider a route to trigger a re-build for an existing `clientId` (e.g., if a site is in `qa_hold` and needs regeneration).