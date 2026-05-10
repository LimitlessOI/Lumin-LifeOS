The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file was not found, so this audit is based on the `DOMAIN_CONTEXT` and the API surface.

### Shipped Controls (based on `public/overlay/site-builder-command-center.html` description and API surface)

The Command Center is described as an "Operator dashboard: analyze prospects, build & send, pipeline table." Based on the available API routes, the following operator actions are supported:

*   **Analyze Prospects:** Operators can trigger an opportunity score for an existing site using `POST /api/v1/sites/analyze`. This provides `score, grade, painPoints, strengths, isChain, isSpa`.
*   **Build & Send Site:** Operators can initiate the full pipeline (score, build, send email) for a single prospect via `POST /api/v1/sites/prospect`. They can also build a site without sending an email using `POST /api/v1/sites/build` (with `skipEmail: true`).
*   **Pipeline Table View:** The `GET /api/v1/sites/prospects` endpoint provides a CRM-like list of prospects, enabling operators to view the pipeline.
*   **Pipeline Stats:** The `GET /api/v1/sites/dashboard` route provides aggregate pipeline metrics (total, built, qa_hold, sent, viewed, replied, converted, total_revenue).
*   **Update Prospect Status:** Operators can update a prospect's status and `deal_value` using `PATCH /api/v1/sites/prospects/:clientId/status`.
*   **Send Follow-Up:** Operators can manually trigger a follow-up email for a prospect using `POST /api/v1/sites/follow-up`.
*   **List Preview Sites:** Operators can retrieve a list of all built preview sites via `GET /api/v1/sites/previews`.
*   **View POS Partners:** Operators can retrieve the list of POS commission partners using `GET /api/v1/sites/pos-partners`.

### Missing Operator Actions

Based on the full domain context and common command center functionality, the following operator actions are not explicitly supported by existing routes or are not yet wired to the UI:

*   **Bulk Prospect Processing UI:** While `POST /api/v1/sites/bulk-prospect` exists, there's no explicit UI control mentioned for processing multiple prospects in a batch from the command center.
*   **Email Suppression Management:** There are no API routes for operators to manually add or remove emails from the `email_suppressions` table.
*   **Detailed Outreach Log View:** Operators cannot view the full `outreach_log` for a specific prospect, including all sent emails, subjects, bodies, and statuses beyond the basic `email_sent` flag on `prospect_sites`.
*   **Full Prospect Detail View:** There is no dedicated endpoint to retrieve a single prospect's full details, including all `metadata` and `qualityReport`, which would be crucial for operator review. (This is a "Next approved task").
*   **Editing Prospect Information:** Beyond status and `deal_value`, operators cannot edit other prospect details like `contact_email`, `contact_name`, or `business_url` via the API.
*   **Triggering Discovery/Ranking:** The `site-builder-prospect-discovery.mjs` and `site-builder-batch-rank.mjs` scripts are CLI-based, with no UI integration for operators to initiate these processes from the command center.

### Route Dependencies

The `public/overlay/site-builder-command-center.html` dashboard relies on the following API routes (mounted at `/