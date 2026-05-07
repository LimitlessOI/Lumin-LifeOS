**Shipped controls**
*   **Authentication**: Connects using a `commandKey` stored in `localStorage`.
*   **Data Refresh**: `loadData()` fetches pipeline statistics and prospect list.
*   **Logout**: Clears the `commandKey` from `localStorage`.
*   **Analyze Existing Site**: `analyzeProspect()` calls `POST /api/v1/sites/analyze` to score a business URL.
*   **Prefill Build Form**: `prefillBuild()` populates the build form's `businessUrl` from the analysis result.
*   **Build Mock Site & Send Outreach**: `buildProspect()` calls `POST /api/v1/sites/prospect`, with an option to `skipEmail`.
*   **View Prospect Preview**: Provides a direct link to the `preview_url` for each prospect.
*   **Update Prospect Status**: `updateStatus()` calls `PATCH /api/v1/sites/prospects/:clientId/status` to change a prospect's status to `built`, `sent`, `viewed`, `replied`, `converted`, or `lost`.

**Route dependencies**
*   `POST /api/v1/sites/analyze`
*   `POST /api/v1/sites/prospect`
*   `GET /api/v1/sites/dashboard`
*   `GET /api/v1/sites/prospects`
*   `PATCH /api/v1/sites/prospects/:clientId/status`

**Risks**
*   **`deal_value` not editable**: The `PATCH /api/v1/sites/prospects/:clientId/status` route supports updating `deal_value`, but the UI does not provide an input field for operators to set this value when marking a prospect as `converted`.
*   **No direct `/build` route exposure**: The UI uses `POST /api/v1/sites/prospect` with `skipEmail` to build sites without sending emails. The dedicated `POST /api/v1/sites/build` route (P45) is not directly exposed or utilized by the UI.
*   **Limited prospect list**: The `loadData()` function fetches a maximum of 50 prospects (`limit=50`), which may not be sufficient for larger pipelines, potentially hiding older or less active prospects from the operator's view.
*   **Incomplete status update options**: The status update dropdown in the prospect table does not include `qa_hold` or `expired` as selectable options, despite these being valid `prospect_sites.status` values and `qa_hold` being displayed in the dashboard stats.

**Next queue slices**
*   Add UI for `POST /api/v1/sites/follow-up` (P40) to manually send follow-up emails to prospects.
*   Add UI for `GET /api/v1/sites/pos-partners` (P41) to display the list of POS commission partners.
*   Add an input field to the `updateStatus` action for `deal_value` when a prospect's status is changed to `converted`.
*   Implement a "Bulk Prospect" feature utilizing `POST /api/v1/sites/bulk-prospect`.
*   Enhance the prospect table with pagination, infinite scroll, or filtering options to handle more than 50 prospects.
*   Add `qa_hold` and `expired` to the prospect status update dropdown.
*   Add a dedicated "Build Only" button that calls `POST /api/v1/sites/build` directly.
*   Add a section to list all built preview sites using `GET /api/v1/sites/previews`.