The `AMENDMENT_05_SITE_BUILDER.md` file, a key source of truth, is missing from the repository.

### Shipped controls

Based on the provided `routes/site-builder-routes.js` file, the following operator action is currently implemented and available:

*   **Discover Prospects (`POST /api/v1/sites/discover`)**: Allows operators to search for new wellness businesses by city and niche. This endpoint leverages Google Places API if `GOOGLE_PLACES_KEY` is configured, otherwise it indicates that manual research guidance would be provided (though the API response itself does not contain this guidance).

### Route dependencies

The `public/overlay/site-builder-command-center.html` is described as an "Operator dashboard: analyze prospects, build & send, pipeline table". To fully function as intended, it would depend on the following API routes, which are defined in the domain context's API surface but are *not* present in the provided `routes/site-builder-routes.js` file:

*   `GET /api/v1/sites/dashboard`: To display overall pipeline statistics (total, built, sent, viewed, replied, converted, revenue).
*   `GET /api/v1/sites/prospects`: To populate the CRM pipeline table with a list of prospects.
*   `POST /api/v1/sites/analyze`: To perform an opportunity score on a prospect's existing site.
*   `POST /api/v1/sites/build`: To initiate the site building process for a given URL.
*   `POST /api/v1/sites/prospect`: To trigger the full build, score, and cold outreach email process for a single prospect.
*   `POST /api/v1/sites/bulk-prospect`: To process multiple prospects in a batch.
*   `PATCH /api/v1/sites/prospects/:clientId/status`: To allow operators to manually update a prospect's status and deal value.
*   `POST /api/v1/sites/follow-up`: To manually send a follow-up email to a specific prospect.
*   `GET /api/v1/sites/previews`: To list all generated preview sites.
*   `GET /api/v1/sites/pos-partners`: To display available POS commission partners.

### Risks

*   **Incomplete Command Center Functionality**: The `site-builder-command-center.html` would be largely non-functional for core pipeline management (viewing, building, sending, updating) as most of its required API routes are not yet implemented in `routes/site-builder-routes.js`. Only prospect discovery is currently supported.
*   **Missing Amendment Context**: The absence of `AMENDMENT_05_SITE_BUILDER.md` means there might be specific design or functional requirements for the Command Center that are not captured in the general domain context, leading to potential misalignments in future implementations.
*   **`GOOGLE_PLACES_KEY` Dependency**: The `/discover` endpoint's reliance on `GOOGLE_PLACES_KEY` means that without it, the functionality degrades to "manual guidance," which is not explicitly handled in the API response, potentially leading to a poor user experience in the Command Center if the key is missing.

### Next queue slices

The immediate next steps to enable the full functionality of the Site Builder Command Center, based on the missing routes and approved tasks, include:

*   Implement all missing API routes from the domain context's API surface (e.g., `/dashboard`, `/prospects`, `/analyze`, `/build`, `/prospect`, `/bulk-prospect`, `/previews`, `/prospects/:clientId/status`, `/follow-up`, `/pos-partners`).
*   Add `GET /api/v1/sites/prospects/:clientId` endpoint to provide detailed prospect information for the Command Center's individual prospect view.