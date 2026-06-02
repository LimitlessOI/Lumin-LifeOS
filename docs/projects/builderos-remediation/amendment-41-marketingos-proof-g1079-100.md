### Proof-Closing Blueprint Note: MarketingOS SSOT Foundation (g1079-100)

**1. Exact Missing Implementation or Proof Gap:**
The core gap is the lack of a demonstrable Single Source of Truth (SSOT) for foundational MarketingOS entities. Specifically, the absence of a defined, persistent, and verifiable data model and access layer for a core entity like `Campaign` that can serve as the SSOT. This gap prevents subsequent MarketingOS features from having a reliable data foundation.

**2. Smallest Safe Build Slice to Close It:**
Implement a minimal `Campaign` entity data model, its persistence layer (e.g., a database table), and a basic API endpoint to create and retrieve `Campaign` records. This slice will prove the SSOT by demonstrating consistent data storage and retrieval.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/data/marketingos/campaign.model.js`: Define the `Campaign` data schema/model.
*   `src/data/marketingos/campaign.dao.js`: Implement basic CRUD operations for `Campaign` (e.g., `createCampaign`, `getCampaignById`).
*   `src/api/marketingos/campaigns.routes.js`: Add a minimal `POST /marketingos/campaigns` (create) and `GET /marketingos/campaigns/:id` (retrieve) endpoint.
*   `src/api/marketingos/index.js`: Register the new `campaigns.routes.js` to the MarketingOS API router.
*   `src/db/migrations/V_XXX_create_campaigns_table.sql`: Database migration to create the `campaigns` table with `id`, `name`, `status`, `createdAt`, `updatedAt` fields.

**4. Verifier/Runtime Checks:**
*   **API Check (Create):**
    *   `POST /marketingos/campaigns` with `{ "name": "Test Campaign 1", "status": "draft" }`
    *   Expected: HTTP 201, response body contains the created campaign with a unique `id`.
*   **API Check (Retrieve):**
    *   `GET /marketingos/campaigns/:id` (using the `id` obtained from the create step)
    *   Expected: HTTP 200, response body matches the created campaign data.
*   **Database Check:**
    *   Direct SQL query: `SELECT id, name, status FROM campaigns WHERE id = <id_from_api_check>;`
    *   Expected: One row returned, matching the `id`, `name`, and `status` sent via API.
*   **Consistency Check:**
    *   Perform multiple create/retrieve cycles to ensure data integrity and uniqueness of IDs.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   API `POST` returns non-201 status code or incorrect/incomplete data in the response.
*   API `GET` returns non-200 status code or data that does not precisely match the created record.
*   Database query does not return the expected record, returns inconsistent data,