### AMENDMENT_41_MARKETINGOS - Proof G19-100: SSOT Foundation for Campaign Data

This blueprint note addresses the "SSOT foundation" signal for `AMENDMENT_41_MARKETINGOS`, specifically focusing on ensuring `Campaign` data adheres to a Single Source of Truth (SSOT).

**1. Exact Missing Implementation or Proof Gap:**
The current implementation lacks explicit runtime verification that `Campaign` entity data, as consumed and processed by MarketingOS features, consistently originates from and aligns with the designated SSOT (e.g., `MarketingDataService.getCampaignById`). This gap can lead to data inconsistencies if `Campaign` data is inadvertently sourced from or modified by non-SSOT pathways.

**2. Smallest Safe Build Slice to Close It:**
Implement a lightweight, configurable SSOT validation layer within the `CampaignService` data access methods. This layer will:
    a. Intercept `Campaign` data retrieval and update operations.
    b. Compare the retrieved/updated data against the designated SSOT for key fields (e.g., `id`, `name`, `status`, `startDate`, `endDate`).
    c. Log discrepancies and, optionally, enforce strict adherence by throwing an error or reverting to SSOT data based on configuration.
    d. Introduce a `CampaignSSOTValidator` utility.

**3. Exact Safe-Scope Files to Touch First:**
*   `services/marketing/CampaignService.js`: Modify `getCampaignById`, `updateCampaign`, and `createCampaign` methods to incorporate SSOT validation.
*   `utils/marketing/CampaignSSOTValidator.js`: New file to encapsulate SSOT validation logic.
*   `config/marketing.js`: Add configuration for SSOT enforcement level (e.g., `LOG_ONLY`, `ENFORCE_STRICT`).
*   `tests/unit/services/marketing/CampaignService.test.js`: Add unit tests for SSOT validation scenarios.
*   `tests/unit/utils/marketing/CampaignSSOTValidator.test.js`: Add unit tests for the new validator utility.

**4. Verifier/Runtime Checks:**
*   **Unit Tests:**
    *   `CampaignService.test.js`: Verify that `getCampaignById` logs a warning when data from its internal cache (if any) differs from the SSOT.
    *   `CampaignService.test.js`: Verify that `updateCampaign` attempts to write to the SSOT and, if configured, rejects updates that conflict with SSOT data.
    *   `CampaignSSOTValidator.test.js`: Test various scenarios of matching and mismatching campaign data against a mock SSOT source.
*   **Integration Tests (Staging):**
    *   Deploy a test MarketingOS feature that retrieves and displays `Campaign` data. Introduce a simulated data discrepancy in a non-SSOT source and verify that the SSOT validation logs the discrepancy or prevents the inconsistent data from being used.
    *   Execute a test `Campaign` update via MarketingOS and verify that the update propagates correctly to the SSOT and that subsequent retrievals reflect the SSOT data.
*   **Runtime Monitoring:**
    *   Monitor logs for `SSOT_DISCREPANCY` warnings or errors originating from `CampaignService`.
    *   Track latency impact of SSOT validation on critical `Campaign` data operations.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   **Critical Data Mismatch:** If `Campaign` data retrieved by MarketingOS consistently (e.g., >5% of requests over 1 hour) shows discrepancies with the designated SSOT, indicating a fundamental data integrity issue.
*   **SSOT Unreachability/Failure:** If the designated `MarketingDataService` (SSOT for campaigns) becomes consistently unreachable or returns malformed data, preventing SSOT validation or data operations.
*   **Performance Degradation:** If the SSOT validation layer introduces a measurable and unacceptable performance overhead (e.g., >100ms average latency increase on `getCampaignById` in production).
*   **Validation Bypass:** If logs indicate that `Campaign` data is being created or updated through pathways that bypass the `CampaignService`'s SSOT validation.