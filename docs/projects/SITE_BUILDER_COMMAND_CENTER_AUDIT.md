**Site Builder Command Center Audit**

This audit is grounded in the provided DOMAIN CONTEXT and the `routes/site-builder-routes.js` file, as `docs/projects/AMENDMENT_05_SITE_BUILDER.md` was not found.

### Shipped Controls

The existing API surface supports the following operator actions, likely exposed in the Command Center:

*   **Build Site**: Operators can trigger a site build from a URL (`POST /api/v1/sites/build`), receiving a `previewUrl` and `qualityReport` without sending an email.
*   **Prospect & Send**: Operators can initiate the full pipeline for a single prospect (opportunity score, site build, AI email, send) via `POST /api/v1/sites/prospect`.
*   **Bulk Prospect**: Operators can process up to