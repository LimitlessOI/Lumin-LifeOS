Proof-Closing Blueprint Note: Amendment 41 MarketingOS - Gap G495-100
Signal requiring follow-through: This document — SSOT foundation.

1. Exact Missing Implementation or Proof Gap
The exact missing proof gap (G495-100) is the lack of automated, end-to-end verification that MarketingOS campaign engagement data, once successfully ingested by LifeOS, is correctly persisted, accurately retrievable via the designated internal apiEP, and strictly adheres to the "no TSOS customer-facing exposure" constraint as specified in `AMENDMENT_41_MARKETINGOS.md`. This gap specifically targets the data pipeline integrity and internal access control for the `MarketingCampaignEngagement` entity.

2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves creating a new, dedicated integration test suite. This suite will simulate the ingestion of MarketingOS data, trigger the relevant LifeOS ingestion process, and then programmatically query the internal API to assert data correctness, completeness, and adherence to access control policies. This slice will add new test code without modifying existing production features or customer-facing surfaces.

3. Exact Safe-Scope Files to Touch First
-   `tests/integration/marketingos-campaign-engagement.test.ts` (NEW FILE)
-   `src/services/marketingos-ingest.service.ts` (READ-ONLY: for understanding ingestion patterns)
-   `src/api/internal/marketing/campaign-engagement.controller.ts` (READ-ONLY: for understanding internal API patterns)
-   `src/db/models/MarketingCampaignEngagement.model.ts` (READ-ONLY: for understanding data model)
-   `tests/utils/test-data-generator.ts` (NEW FILE, if a shared utility for test data is beneficial)

4. Verifier/Runtime Checks
The integration test suite (`marketingos-campaign-engagement.test.ts`) will implement the following checks:
-   Data Ingestion & Persistence:
    -   Simulate a batch of valid MarketingOS campaign engagement records.
    -   Trigger the `marketingos-ingest.service.ts` to process these records.
    -   Query the internal `/internal/marketing/campaign-engagement` apiEP using an authenticated internal service token.
    -   Assert that the number of records retrieved matches the number ingested.
    -   Assert that the content of retrieved records (e.g., campaign ID, engagement type, metrics) precisely matches the simulated input data.
    -   Assert data types and schema integrity for retrieved records.
-   Internal Access Control:
    -   Attempt to access the `/internal/marketing/campaign-engagement` endpoint with a valid internal service token. Assert a `200 OK` response.
    -   Attempt to access the same endpoint with an invalid or missing internal service token. Assert a `401 Unauthorized` or `403 Forbidden` response.
-   External/TSOS Access Control (Negative Test):
    -   Attempt to access the `/internal/marketing/campaign-engagement` endpoint using a simulated TSOS customer auth context (e.g., a customer-scoped JWT or apiKey).
    -   Assert a `401 Unauthorized` or `403 Forbidden` response, explicitly confirming that this internal endpoint is not exposed to TSOS customers.
-   Basic Performance:
    -   Measure the response time for querying a representative dataset from the internal API. Assert that it falls within an acceptable threshold (e.g., < 500ms).

5. Stop Conditions if Runtime Truth Disagrees
If any of the verifier/runtime checks fail:
-   **Data Ingestion & Persistence Failure:** If ingested data is not persisted, is incomplete, or is corrupted upon retrieval, the build must stop. This indicates a critical data integrity breach.
-   **Internal Access Control Failure (Unauthorized Access):** If the internal API endpoint is accessible without a valid internal service token, or if an invalid token grants access, the build must stop. This indicates a security vulnerability.
-   **External/TSOS Access Control Failure (Customer Exposure):** If the internal API endpoint is accessible via a simulated TSOS customer context, the build must stop. This is a direct violation of the "no TSOS customer-facing exposure" constraint and a critical security and compliance failure.
-   **Performance Degradation:** If query response times consistently exceed the defined threshold (e.g., > 500ms for a representative dataset), the build should be flagged for performance review and potential optimization, but may not necessarily stop unless it impacts critical BuilderOS operations. This is a soft stop condition, requiring human review.