The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file is missing, so this audit cannot fully ground outputs in that document. The provided `routes/site-builder-routes.js` file only contains the `/discover` endpoint, contradicting the domain context which states it contains "All siteBld apiEPs". This audit proceeds assuming the provided file content is authoritative for what is *currently implemented* in `routes/site-builder-routes.js`.

### Shipped controls

Based on the provided `routes/site-builder-routes.js` content:

*   **Prospect Discovery:** `POST /api/v1/sites/discover` allows operators to find new prospects by city and niche using Google Places API. This supports the "discover" phase of the pipeline.

### Missing operator actions

Based on the `public/overlay/site-builder-command-center.html` purpose ("analyze prospects, build & send, pipeline table") and the "API surface" described in the DOMAIN CONTEXT, but *not* present in the provided `routes/site-builder-routes.js` content:

*   **Site Building:** `POST /api/v1/sites/build` (Build site from URL)
*   **Full Prospect Process:** `POST /api/v1/sites/prospect` (Build + score + send cold outreach)
*   **Bulk Prospecting:** `POST /api/v1/sites/bulk-prospect` (Batch processing)
*   **Opportunity Analysis:** `POST /api/v1/sites/analyze` (Score existing site)
*   **Preview Listing:** `GET /api/v1/sites/previews` (List all built preview sites)
*   **CRM Pipeline View:** `GET /api/v1/sites/prospects` (List all prospects)
*   **Pipeline Dashboard:** `GET /api/v1/sites/dashboard` (Pipeline stats)
*   **Prospect Status Update:** `PATCH /api/v1/sites/prospects/:clientId/status` (Update status and deal value)
*   **Manual Follow-up:** `POST /api/v1/sites/follow-up` (Send follow-up email)
*   **POS Partner Listing:** `GET /api/v1/sites/pos-partners` (List commission partners)
*   **Preview View Tracking:** `GET /api/v1/sites/preview-view` (Tracking pixel endpoint)
*   **Email Reply Webhook:** `POST /api/v1/sites/email-reply-webhook` (Postmark inbound webhook)

### Route dependencies

The `public/overlay/site-builder-command-center.html` would depend on the following routes to fulfill its described purpose:

*   `GET /api/v1/sites/dashboard`: To display overall pipeline statistics.
*   `GET /api/v1/sites/prospects`: To populate the main pipeline table with prospect data.
*   `POST /api/v1/sites/discover`: To enable the operator to find new prospects.
*   `POST /api/v1/sites/analyze`: To analyze a prospect's existing site before building.
*   `POST /api/v1/sites/build` or `POST /api/v1/sites/prospect`: To initiate site builds and outreach.
*   `PATCH /api/v1/sites/prospects/:clientId/status`: To manually update prospect statuses (e.g., `converted`, `lost`).
*   `POST /api/v1/sites/follow-up`: To trigger manual follow-up emails.
*   `GET /api/v1/sites/previews`: To view or manage built preview sites.

### Risks

*   **Incomplete API Surface:** The provided `routes/site-builder-routes.js` is significantly incomplete relative to the described "API surface" in the DOMAIN CONTEXT. This means the Command Center would be largely non-functional if it relies solely on the routes present in the provided file.
*   **Missing Amendment Context:** The absence of `AMENDMENT_05_SITE_BUILDER.md` means the audit cannot verify specific design or functional requirements for the Command Center that might be detailed there.
*   **`GOOGLE_PLACES_KEY` Dependency:** The `/discover` route relies on `process.env.GOOGLE_PLACES_KEY`. If this key is missing or invalid, the discovery functionality will fail, returning an error message. The Command Center UI would need to handle this gracefully and potentially guide the operator to manual research.

### Next queue slices

*   Implement the missing API endpoints in `routes/site-builder-routes.js` as per the DOMAIN CONTEXT's "API surface" table.
*   Add `GET /api/v1/sites/prospects/:clientId` endpoint to retrieve detailed information for a single prospect, including full metadata and qualityReport.
*   Clarify the authoritative source for the complete set of API routes for the Site Builder domain.