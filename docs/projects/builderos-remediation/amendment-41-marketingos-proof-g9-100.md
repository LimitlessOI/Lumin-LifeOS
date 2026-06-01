### AMENDMENT_41_MARKETINGOS Proof-G9-100: SSOT Foundation for MarketingCampaign Entity

This blueprint note addresses the foundational implementation gap for the `MarketingCampaign` entity, establishing its Single Source of Truth (SSOT) within the LifeOS platform as defined by `AMENDMENT_41_MARKETINGOS.md`.

**1. Exact Missing Implementation or Proof Gap:**
The core `MarketingCampaign` entity, as defined by the SSOT in `AMENDMENT_41_MARKETINGOS.md`, lacks a canonical, production-ready API endpoint and persistence layer that strictly adheres to its schema and lifecycle. This gap prevents other MarketingOS components from reliably interacting with campaign data.

**2. Smallest Safe Build Slice to Close It:**
Implement the foundational data model, service, and API routes for the `MarketingCampaign` entity, focusing on basic CRUD operations (Create, Read by ID, Read All) that directly reflect the SSOT schema. This slice establishes the core contract for campaign data.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/models/marketingCampaign.js`: Define the Mongoose/ORM schema for `MarketingCampaign` based on `AMENDMENT_41_MARKETINGOS.md`.
*   `src/services/marketingCampaignService.js`: Implement business logic for creating and retrieving `MarketingCampaign` instances.
*   `src/routes/marketingCampaignRoutes.js`: Define API endpoints (`POST /api/v1/marketing-campaigns`, `GET /api/v1/marketing-campaigns`, `GET /api/v1/marketing-campaigns/:id`).
*   `src/schemas/marketingCampaignValidation.js`: (If using Joi/Yup) Define validation schemas for API requests, mirroring the model.

**4. Verifier/Runtime Checks:**
*   **API Endpoint Verification:**
    *   `GET /api/v1/marketing-campaigns`: Returns an array of `MarketingCampaign` objects, each conforming to the SSOT schema.
    *   `POST /api/v1/marketing-campaigns`: Successfully creates a new campaign when provided with SSOT-compliant data, returning the created campaign object.
    *   `GET /api/v1/marketing-campaigns/:id`: Returns a single `MarketingCampaign` object matching the provided ID, conforming to the SSOT schema.
*   **Schema Adherence:**
    *   Verify that all fields (e.g., `id`, `name`, `description`, `status`, `startDate`, `endDate`, `budget`, `targetAudience`) and their types/constraints in API responses and database entries precisely match the `AMENDMENT_41_MARKETINGOS.md` definition.
    *   Test edge cases for required fields and data type validations.
*   **Data Persistence:**
    *   Ensure created campaigns are durably stored in the database and retrievable across service restarts.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   API responses for `MarketingCampaign` entities do not match the SSOT schema (e.g., missing required fields, incorrect data types, unexpected fields).
*   Campaign creation fails for valid SSOT-compliant input data.
*   Retrieval of existing campaigns by ID or as a list returns inconsistent or malformed data.
*   Validation logic allows non-SSOT-compliant data to be persisted or returned.