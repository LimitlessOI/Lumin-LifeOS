# Site Builder Command Center Audit

## Shipped Controls

The following operator actions are supported by the existing API routes, enabling functionality within the Command Center:

*   **Build Site from URL**: `POST /api/v1/sites/build` allows operators to manually build a preview site from a given URL.
*   **Prospect & Outreach**: `POST /api/v1/sites/prospect` enables processing a single prospect, including opportunity scoring, site building, and sending a cold outreach email.
*   **Bulk Prospecting**: `POST /api/v1/sites/bulk-prospect` supports processing multiple prospects in a single batch.
*   **Analyze Existing Site**: `POST /api/v1/sites/analyze` provides the opportunity score, grade, pain points, and other details for a prospect's existing website.
*   **List Preview Sites**: `GET /api/v1/sites/previews` retrieves a list of all generated preview sites.
*   **List Prospects (CRM View)**: `GET /api/v1/sites/prospects` provides a paginated list of prospects in the pipeline, suitable for a CRM-style table.
*   **Update Prospect Status**: `PATCH /api/v1/sites/prospects/:clientId/status` allows operators to manually update a prospect's status (e.g., mark as `converted`) and `deal_value`.
*   **Send Follow-up Email**: `POST /api/v1/sites/follow-up` triggers a follow-up email for a specific prospect.
*   **List POS Partners**: `GET /api/v1/sites/pos-partners` provides the list of supported POS commission partners.
*   **Pipeline Dashboard Stats**: `GET /api/v1/sites/dashboard` delivers aggregated statistics for the entire prospect pipeline (total, built, sent, viewed, replied, converted, total revenue).
*   **Launch Readiness Check**: `GET /api/v1/sites/launch-readiness` reports on critical environment variables and configuration blockers.

Automated actions that contribute to the pipeline state, but are not direct operator controls:

*   **Preview View Tracking**: `GET /api/v1/sites/preview-view` automatically updates a prospect's status to `viewed` when their preview site is opened.
*   **Email Reply Webhook**: `POST /api/v1/sites/email-reply-webhook` automatically updates a prospect's status to `replied` upon receiving a reply to a cold email.

## Route Dependencies

The `public/overlay/site-builder-command-center.html` likely depends on the following routes to render its UI and enable operator actions:

*   **Pipeline Table**: `GET /api/v1/sites/prospects`
*   **Pipeline Summary/Dashboard**: `GET /api/v1/sites/dashboard`
*   **Manual Site Build Form**: `POST /api/v1/sites/build`
*   **Single Prospect Outreach Form**: `POST /api/v1/sites/prospect`
*   **Bulk Prospect Upload**: `POST /api/v1/sites/bulk-prospect`
*   **Prospect Analysis Tool**: `POST /api/v1/sites/analyze`
*   **Prospect Detail/Action Buttons**: `PATCH /api/v1/sites/prospects/:clientId/status`, `POST /api/v1/sites/follow-up`
*   **Preview Site Links/List**: `GET /api/v1/sites/previews`
*   **POS Partner Selection**: `GET /api/v1/sites/pos-partners`
*   **System Health Indicator**: `GET /api/v1/sites/launch-readiness`

## Risks

*   **Missing Amendment Document**: The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file was not found (`ENOENT`). This means the audit relies on the `routes/site-builder-routes.js` header and domain context, which may not fully capture all amendment details or specific operator requirements.
*   **Rate Limiting for Operators**: The `buildLimiter` (10 builds/hour) and `prospectLimiter` (50 prospects/hour) are applied per IP. While necessary for public API protection, operators using the Command Center from a single IP might encounter these limits during intensive work, potentially impacting workflow.
*   **Lack of Single Prospect Detail Route**: There is no `GET /api/v1/sites/prospects/:clientId` route. This means the Command Center cannot efficiently fetch detailed information for a single prospect without either loading the entire `/prospects` list and filtering client-side, or making multiple calls to other routes to piece together the data. This is explicitly listed as a next approved task.
*   **Generic Error Messages**: API error responses (`*j500`) often return only `err.message`. For an operator-facing tool, more structured or user-friendly error codes and messages could improve debugging and user experience.

## Next Queue Slices

1.  **Implement `GET /api/v1/sites/prospects/:clientId`**: Add an endpoint to retrieve full details for a single prospect, including `metadata` and `qualityReport`.
2.  **Add A/B Email Subject Line Tracking**: Integrate `variant` field into `outreach_log` and track open/reply rates by variant.
3.  **Improve Quality Scorer**: Enhance `site-builder-quality-scorer.js` with checks for visible phone numbers, Google Maps embeds, and SSL trust badges.
4.  **Add Preview Site Video Embed**: Wire the `youtubeChannelId` from discovery to `site-builder.js` to embed the latest YouTube video on preview sites.