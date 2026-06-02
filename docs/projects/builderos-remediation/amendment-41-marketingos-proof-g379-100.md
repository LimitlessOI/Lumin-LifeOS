# AMENDMENT_41_MARKETINGOS - Proof G379-100: MarketingCampaign SSOT Foundation

This document serves as a proof-closing blueprint note for establishing MarketingOS as the Single Source of Truth (SSOT) for `MarketingCampaign` entities, as mandated by `AMENDMENT_41_MARKETINGOS.md`.

---

### 1. Exact Missing Implementation or Proof Gap

The core proof gap is the absence of a validated, canonical, and externally accessible API endpoint within MarketingOS that unequivocally serves `MarketingCampaign` data as the SSOT. While internal data structures may exist, the external contract and its operational proof are missing. Specifically, other systems cannot reliably query MarketingOS for the definitive state of a `MarketingCampaign` via a dedicated, versioned SSOT endpoint.

### 2. Smallest Safe Build Slice to Close It

Implement a read-only, versioned API endpoint in MarketingOS to expose canonical `MarketingCampaign` data. This slice will focus on:
*   Defining the canonical `MarketingCampaign` schema for external consumption.
*   Creating a `/api/v1/marketing/campaigns/{id}` endpoint for retrieving a single campaign by ID.
*   Creating a `/api/v1/marketing/campaigns` endpoint for listing campaigns (with basic pagination/filtering).
This slice prioritizes establishing the *read* SSOT contract without introducing write capabilities or complex business logic, minimizing surface area and risk.

### 3. Exact Safe-Scope Files to Touch First

*   `services/marketingos/src/routes/campaigns.js`: Define new API routes for `/api/v1/marketing/campaigns` and `/api/v1/marketing/campaigns/{id}`.
*   `services/marketingos/src/controllers/campaignController.js`: Implement handler functions for retrieving campaign data, ensuring it conforms to the canonical schema.
*   `services/marketingos/src/models/MarketingCampaign.js`: Review and, if necessary, refine the Mongoose/ORM model to ensure it accurately represents the canonical `MarketingCampaign` structure.
*   `services/marketingos/src/app.js`: Register the new `campaigns.js` routes with the main Express application.
*   `services/marketingos/src/schemas/MarketingCampaignSchema.js` (new file, if not existing): Define the Joi/Zod schema for API response validation.

### 4. Verifier/Runtime Checks

*   **Endpoint Availability:** `GET /api/v1/marketing/campaigns` and `GET /api/v1/marketing/campaigns/{id}` return HTTP 200 OK.
*   **Schema Conformance:** Responses from both endpoints strictly adhere to the defined canonical `MarketingCampaign` schema (e.g., via JSON Schema validation).
*   **Data Consistency:** For a known set of `MarketingCampaign` IDs, data retrieved via the API matches the internal MarketingOS database representation.
*   **Performance:** Average response time for `GET /api/v1/marketing/campaigns/{id}` is < 50ms. Average response time for `GET /api/v1/marketing/campaigns` (with default pagination) is < 200ms.
*   **Error Handling:** Invalid IDs return 404 Not Found. Server errors return 500 Internal Server Error with appropriate logging.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Persistent Schema Mismatch:** If API responses consistently deviate from the canonical `MarketingCampaign` schema, indicating a fundamental data contract failure.
*   **Data Inconsistency:** If a significant percentage (e.g., >5%) of sampled `MarketingCampaign` data retrieved via the API does not match the internal database state.
*   **High Error Rate:** If the API endpoints exhibit an error rate (non-2xx responses) exceeding 1% over a sustained period.
*   **Performance Degradation:** If average response times for the new endpoints exceed 2x the target thresholds, indicating potential resource contention or inefficient queries impacting overall service health.
*   **Unintended Side Effects:** If logs or monitoring reveal unexpected impacts on other MarketingOS functionalities or external integrations.