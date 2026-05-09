### Shipped controls

*   **Discover Prospects**: `POST /api/v1/sites/discover` allows operators to find new businesses by city and niche, populating a list for further action.
*   **Build Site Preview**: `POST /api/v1/sites/build` enables manual generation of a site preview from a URL, returning the `previewUrl` and `qualityReport` for review.
*   **Analyze Existing Site**: `POST /api/v1/sites/analyze` provides an opportunity score for a prospect's existing site, detailing pain points and strengths to aid prioritization.
*   **Process Single Prospect**: `POST /api/v1/sites/prospect` initiates the full pipeline for a single prospect: opportunity scoring, site building, cold email sending, and database recording.
*   **Process Bulk Prospects**: