Proof-Closing Blueprint Note: Amendment 41 - MarketingOS SSOT Foundation (g113-100)
This document addresses the identified gap in establishing LifeOS as the Single Source of Truth (SSOT) for marketing campaign data originating from MarketingOS, as outlined in `docs/projects/AMENDMENT_41_MARKETINGOS.md`.
1. Exact Missing Implementation or Proof Gap (g113-100)
The core gap is the absence of a dedicated, idempotent apiEP and associated service logic within LifeOS to reliably receive, validate, and persist marketing campaign updates from MarketingOS. This mechanism is crucial for ensuring data consistency and establishing LifeOS as the authoritative source for campaign metadata, preventing data drift and enabling downstream LifeOS features to rely on accurate, up-to-date campaign information.
Specifically, the gap involves:
-   A secure, authenticated endpoint for external systems (MarketingOS) to push campaign data.
-   Robust data validation against a defined schema.
-   Business logic for upserting (update or insert) campaign records based on a unique identifier.
-   Error handling and logging for failed synchronizations.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves implementing a new API route and its corresponding service layer to handle the ingestion of marketing campaign data. This slice focuses solely on the data reception, validation, and persistence, without immediately integrating with other LifeOS features or UI components.
Slice Scope:
-   Create a new POST endpoint: `/api/v1/marketing/campaigns/sync`.
-   Implement request body validation for campaign data (e.g., `campaignId`, `name`, `status`, `startDate`, `endDate`, `metadata`).
-   Develop a service function to perform an upsert operation on the `MarketingCampaign` entity in the db. This function must be idempotent, meaning repeated calls with the same `campaignId` result in the same state.
-   Ensure proper errHdl for validation failures, db errors, and auth issues.
3. Exact Safe-Scope Files to Touch First
To implement the above slice, the following files are the primary safe-scope targets:
-   `src/api/v1/marketing/campaigns/routes.js`: Define the new POST `/sync` route and link it to the controller.
-   `src/api/v1/marketing/campaigns/controller.js`: Implement the controller function to parse the request, validate, and call the service layer.
-   `src/api/v1/marketing/campaigns/service.js`: Implement the core business logic for upserting campaign data into the db.
-   `src/api/v1/marketing/campaigns/schema.js`: Define the Joi/Zod schema for validating incoming campaign data.
-   `src/db/models/MarketingCampaign.js`: Ensure the `MarketingCampaign` Sequelize/Mongoose model exists and includes all necessary fields (e.g., `campaignId` as a unique identifier, `name`, `status`, `startDate`, `endDate`, `metadata` JSONB field). If the model does not exist, this file will be created.
-   `src/db/migrations/YYYYMMDDHHMMSS-add-marketing-campaign-table.js`: (Conditional) If `MarketingCampaign.js` is new, a corresponding db migration to create the table will be required.
4. Verifier/Runtime Checks
To confirm the successful closure of the gap:
1.  API Endpoint Functionality:
-   Send a POST request to `/api/v1/marketing/campaigns/sync` with a valid campaign payload. Expect a `200 OK` or `201 Created` response.
-   Verify the response body indicates successful processing.
2.  Data Persistence:
-   After a successful API call, query the LifeOS db directly (e.g., via `psql` or a db client) to confirm the `MarketingCampaign` record exists and its fields accurately reflect the submitted data.
3.  Idempotency:
       Send the exact same* POST request (same `campaignId` and data) multiple times. Verify that only one record is created/updated in the db and no duplicate entries or errors occur. The `updatedAt` timestamp should reflect the last update.
4.  Validation & Error Handling:
-   Send POST requests with invalid payloads (e.g., missing required fields, incorrect data types). Expect `400 Bad Request` responses with clear, descriptive error messages indicating the validation failure.
-   Send requests with invalid auth tokens. Expect `401 Unauthorized` or `403 Forbidden`.