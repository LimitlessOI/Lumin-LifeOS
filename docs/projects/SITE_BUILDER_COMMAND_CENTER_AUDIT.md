The `docs/projects/AMENDMENT_05_SITE_BUILDER.md` file is missing, which limits the ability to audit against the full SSOT. The provided `routes/site-builder-routes.js` snippet is also incomplete, requiring reliance on the "API surface" table in the DOMAIN CONTEXT for available routes.

### Shipped controls

Based on the defined API surface and domain context, the Site Builder Command Center (cmdCtr) currently supports the following operator actions:

*   **Prospect Management:**
    *   Initiate a new prospect build and outreach (`POST /api/v1/sites/prospect`).
    *   Process multiple prospects in a batch (`POST /api/v1/sites/bulk-prospect`).
    *   Analyze an existing prospect's site for opportunity scoring (`POST /