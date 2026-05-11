`docs/projects/AMENDMENT_05_SITE_BUILDER.md` is missing, preventing a full audit against the amendment.

**Shipped controls**
The Site Builder Command Center (cmdCtr) is supported by the following operator actions, derived from the API surface and CLI scripts:

*   **Prospect Discovery & Ranking:**
    *   `scripts/site-builder-prospect-discovery.mjs`: CLI for finding wellness businesses.
    *   `scripts/site-builder-batch-rank.mjs`: CLI for batch-scoring and ranking prospects.
    *   `POST /api/v1/sites/analyze`: API for scoring an existing prospect's site.
*   **Site Building & Outreach:**
    *   `POST /api/v1/sites/build`: API for building a site from a URL.
    *   `POST /api/v1/sites/prospect`: API for processing a single prospect (score, build, send email).
    *   `POST /api/v1/sites/bulk-prospect`: API for processing multiple prospects in a batch.
    *   `POST