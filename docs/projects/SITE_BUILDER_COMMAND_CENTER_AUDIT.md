The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file is missing, preventing a full audit against the amendment.

### Shipped controls

Based on the `DOMAIN CONTEXT` and `API surface`, the Site Builder Command Center (`public/overlay/site-builder-command-center.html`) is expected to support the following operator actions, which are backed by existing API routes:

*   **View Pipeline Dashboard:** Display overall funnel metrics (total, built, sent, viewed, replied, converted, revenue).
*   **List Prospects:** View a table of all prospects with key details (business name, URL, status, preview URL, deal value, timestamps).
*   **Analyze Existing Site:** Input a URL to get an opportunity score, grade, pain points, strengths, and flags (`isChain`, `isSpa`).
*   **Build Preview Site:** Input a URL to generate a preview site, returning the `previewUrl` and `qualityReport`.
*   **Prospect & Send Cold Email:** Input prospect details (URL, email, name) to trigger site build, scoring, and personalized cold email outreach.
*   **Bulk Prospecting:** Process a batch of up to 20 prospects.
*   **Update Prospect Status:** Manually change a prospect's status (e.g., `converted`, `lost`, `qa_hold`) and `deal_value`.
*   **Send Manual Follow-up:** Trigger a follow-up email for a specific prospect.
*   **View POS Partners:** List available POS commission partners.

### Route dependencies

The inferred Command Center functionality depends on the following API routes:

*   `GET /api/v1/sites/dashboard`
*   `GET /api/v1/sites/prospects`
*   `POST /api/v1/sites/analyze`
*   `POST /api/v1/sites/build`
*   `POST /api/v1/sites/prospect`
*   `POST /api/v1/sites/bulk-prospect`
*   `PATCH /api/v1/sites/prospects/:clientId/status`
*   `POST /api/v1/sites/follow-up`
*   `GET /api/v1/sites/pos-partners`

### Risks

1.  **Missing Amendment Document:** The primary `AMENDMENT_05_SITE_BUILDER.md` is not available, meaning the audit cannot verify adherence to specific design or business rules outlined there.
2.  **Incomplete Route Implementation Verification:** The provided `routes/site-builder-routes.js` snippet is truncated and does not contain the full implementation of the API surface routes. The audit assumes the `API surface` table accurately reflects implemented routes, but cannot verify their internal logic or completeness from the provided file.
3.  **Lack of Detailed Prospect View:** Without a dedicated endpoint for retrieving a single prospect's full details, including `metadata` and `qualityReport`, the Command Center cannot offer a comprehensive view for operators to make informed decisions, especially for `qa_hold` review.

### Next queue slices

1.  Add `GET /api/v1/sites/prospects/:clientId` endpoint returning single prospect detail with full metadata + qualityReport.
2.  Implement Command Center UI for a detailed prospect view, utilizing the new `GET /api/v1/sites/prospects/:clientId` endpoint.
3.  Develop Command Center UI/workflow for operators to review prospects in `qa_hold` status, inspect their `qualityReport`, and take action (e.g., manually send or mark lost).
4.  Add A/B email subject line test tracking to `outreach_log` (backend task).
5.  Improve quality scorer (backend task).
6.  Add preview site video embed (backend/integration task).