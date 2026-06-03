# Amendment 41 MarketingOS Proof - G1149-100: SSOT Foundation

## 1. Exact Missing Implementation or Proof Gap

The core gap is the implementation and validation of the Marketing Campaign SSOT data model and its associated read-only API endpoints. This proof specifically targets ensuring that the `Campaign` and `AdSet` entities, as defined in Amendment 41, are correctly represented, stored, and retrievable as the single source of truth within LifeOS, demonstrating data consistency and accessibility.

## 2. Smallest Safe Build Slice to Close It

1.  **Data Model Implementation:** Define the canonical `Campaign` and `AdSet` data models (schema, relationships) in code.
2.  **Service Layer:** Implement a minimal service layer for retrieving `Campaign` and `AdSet` data.
3.  **Read-Only API Endpoints:** Create basic `GET` endpoints to expose the `Campaign` and `AdSet` SSOT data.
4.  **Mock Data/Seeding:** Implement temporary in-memory mock data or a simple seeding mechanism for testing purposes.
5.  **Unit & Integration Tests:** Develop tests to validate the data models, service layer logic, and API responses against the SSOT specification.

## 3. Exact Safe-Scope Files to Touch First

*   `src/marketingos/models/campaign.js` (New: Defines Campaign data model)
*   `src/marketingos/models/adset.js` (New: Defines AdSet data model)
*   `src/marketingos/services/campaignService.js` (New: Handles Campaign/AdSet data retrieval logic)
*   `src/marketingos/routes/campaigns.js` (New: Defines API routes for MarketingOS campaigns)
*   `src/marketingos/index.js` (New: Entry point for MarketingOS module, aggregates routes/models)
*   `src/api/index.js` (Existing: Mounts the new `marketingos` router)
*   `src/marketingos/tests/campaign.test.js` (New: Unit and integration tests for Campaign/AdSet SSOT)

## 4. Verifier/Runtime Checks

*   **API Endpoint Verification:**
    *   `GET /api/marketingos/campaigns`: Expect 200 OK with an array of `Campaign` objects conforming to the SSOT schema.
    *   `GET /api/marketingos/campaigns/{campaignId}`: Expect 200 OK with a single `Campaign` object matching `campaignId`, conforming to the SSOT schema, including linked `AdSet` data.
    *   `GET /api/marketingos/adsets/{adSetId}`: Expect 200 OK with a single `AdSet` object matching `adSetId`, conforming to the SSOT schema.
*   **Data Consistency Checks:**
    *   Programmatic validation (via tests) ensuring that `Campaign` and `AdSet` data retrieved from the API matches the expected SSOT structure, data types, and values.
    *   Verify that relationships (e.g., `AdSets` belonging to `Campaigns`) are correctly represented and traversable.
*   **Schema Validation:**
    *   Automated checks to ensure all required fields are present, and data types align with the SSOT specification for