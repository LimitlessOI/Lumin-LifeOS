The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file, which is the SSOT for this domain, is missing. This makes a complete audit against the amendment impossible.

### Shipped controls

Based on the API surface and the provided `routes/site-builder-routes.js` file, the Site Builder Command Center (cmdCtr) can support the following operator actions:

*   **Prospect Discovery**: `POST /api/v1/sites/discover` (newly added route, allows finding prospects by city and niche).
*   **Site Building**: `POST /api/v1/sites/build` (builds a site from a URL, returns preview).
*   **Full Prospect Pipeline**: `POST /api/v1/sites/prospect` (scores, builds, and sends cold email for a single prospect).
*   **Bulk Prospecting**: `POST /api/v1/sites/bulk-prospect` (scores, builds, and sends for up to 20 prospects).
*   **Opportunity Analysis**: `POST /api/v1/sites/analyze` (scores an existing site for outreach prioritization).
*   **Preview Management**: `GET /api/v1/sites/previews` (lists all built preview sites).
*   **CRM Pipeline View**: `GET /api/v1/sites/prospects` (lists all prospects with pipeline status).
*   **Pipeline Dashboard**: `GET /api/v1/sites/dashboard` (provides aggregate pipeline statistics).
*   **Prospect Status Update**: `PATCH /api/v1/sites/prospects/:clientId/status` (updates a prospect's status and deal value).
*   **Manual Follow-up**: `POST /api/v1/sites/follow-up` (sends a follow-up email to a specific prospect).
*   **POS Partner Listing**: `GET /api/v1/sites/pos-partners` (retrieves a list of commission partners).

Automated actions (not direct operator controls but part of the system):
*   **Preview View Tracking**: `GET /api/v1/sites/preview-view` (marks prospect as 'viewed').
*   **Email Reply Tracking**: `POST /api/v1/sites/email-reply-webhook` (marks prospect as 'replied').

### Route dependencies

The `public/overlay/site-builder-command-center.html` likely depends on the following routes to provide its functionality:

*   `/api/v1/sites/dashboard` for overall pipeline statistics.
*   `/api/v1/sites/prospects` for the main CRM table view of prospects.
*   `/api/v1/sites/discover` for the new prospect discovery feature.
*   `/api/v1/sites/analyze` for on-demand opportunity scoring.
*   `/api/v1/sites/build` or `/api/v1/sites/prospect` for initiating site builds/outreach.
*   `/api/v1/sites/bulk-prospect` for batch operations.
*   `/api/v1/sites/previews` for accessing preview URLs.
*   `/api/v1/sites/prospects/:clientId/status` for updating prospect states.
*   `/api/v1/sites/follow-up` for sending manual follow-ups.
*   `/api/v1/sites/pos-partners` for displaying affiliate options.

### Risks

*   **Missing SSOT**: The `AMENDMENT_05_SITE_BUILDER.md` file is unavailable, which means the authoritative design and business rules for the cmdCtr might not be fully captured or understood, leading to potential misalignments.
*   **Truncated Route File**: The `routes/site-builder-routes.js` file is incomplete, ending abruptly within the `/discover` route implementation. This prevents a full verification of the current route surface and any subsequent routes defined in that file.
*   **API Surface Discrepancy**: The `/api/v1/sites/discover` route is present in `routes/site-builder-routes.js` but not explicitly listed in the "API surface" table in the domain context. This indicates the API surface documentation might be slightly out of sync with the implemented routes.

### Next queue slices

1.  **Implement `GET /api/v1/sites/prospects/:clientId`**: This is an explicit next approved task and is crucial for a detailed view of individual prospects within the cmdCtr.
2.  **Complete `routes/site-builder-routes.js`**: The truncated file needs to be completed to ensure all intended routes are properly defined and functional.
3.  **Integrate `/discover` into cmdCtr UI**: The newly implemented `/discover` route needs to be exposed and usable within the `public/overlay/site-builder-command-center.html` interface.
4.  **Address missing `AMENDMENT_05_SITE_BUILDER.md`**: Recovering or recreating the SSOT document is critical for future development and alignment.