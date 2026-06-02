# Amendment 41 MarketingOS Proof - G703-100: SSOT Foundation for MarketingCampaign

This document outlines the proof-closing blueprint note for establishing the Single Source of Truth (SSOT) foundation for `MarketingCampaign` data, as specified by `AMENDMENT_41_MARKETINGOS.md`.

---

**1. Exact Missing Implementation or Proof Gap:**

The absence of a dedicated, versioned, read-only API endpoint within the MarketingOS service that serves as the canonical SSOT for `MarketingCampaign` data. Specifically, the lack of an endpoint to retrieve the definitive state of a `MarketingCampaign` and its associated metadata, preventing external systems from reliably consuming the SSOT.

**2. Smallest Safe Build Slice to Close It:**

Implement a new read-only GET endpoint: `/marketingos/v1/campaigns/{campaignId}`. This endpoint will query the MarketingOS internal data store for a `MarketingCampaign` by its unique identifier and return its canonical representation. This slice focuses solely on exposing the SSOT, without introducing write capabilities or complex business logic.

**3. Exact Safe-Scope Files to Touch First:**

*   `services/marketingos/src/routes/v1/campaigns.js` (New file: Defines the `/campaigns` route and maps `GET /{campaignId}` to a controller function.)
*   `services/marketingos/src/controllers/v1/campaignController.js` (New file: Implements the `getCampaignById` function, responsible for data retrieval and response formatting.)
*   `services/marketingos/src/models/MarketingCampaign.js` (Existing file: Ensure the model definition accurately reflects the SSOT structure for `MarketingCampaign`.)
*   `services/marketingos/src/schemas/v1/campaignSchema.js` (New file: Defines the JSON schema for validating the API response body for a `MarketingCampaign`.)

**4. Verifier/Runtime Checks:**

*   **Functional:**
    *   `GET /marketingos/v1/campaigns/{validCampaignId}` returns HTTP 200 with a JSON body conforming to `campaignSchema.js`.
    *   `GET /marketingos/v1/campaigns/{invalidCampaignId}` returns HTTP 404.
    *   `GET /marketingos/v1/campaigns/{validCampaignId}` returns data that precisely matches the canonical `MarketingCampaign` record in the MarketingOS internal data store.
*   **Performance:**
    *   Average response time for `GET /marketingos/v1/campaigns/{campaignId}` is < 100ms under typical load.
    *   Endpoint sustains 99th percentile latency < 250ms.
*   **Integrity:**
    *   Response data types and values align with the SSOT specification in `AMENDMENT_41_MARKETINGOS.md`.

**5. Stop Conditions if Runtime Truth Disagrees:**

*   **Data Inconsistency:** The API consistently returns `MarketingCampaign` data that does not match the internal MarketingOS data store, indicating a synchronization or retrieval error.
*   **Schema Mismatch:** The API response consistently fails validation against `campaignSchema.js`, suggesting a divergence from the defined SSOT structure.
*   **High Error Rate:** The endpoint experiences a sustained error rate (e.g., > 1% non-4xx/5xx errors) indicating instability.
*   **Performance Degradation:** The endpoint consistently fails to meet defined latency SLOs, impacting dependent systems.
*   **Security Vulnerability:** Any identified security flaw in the new endpoint implementation.