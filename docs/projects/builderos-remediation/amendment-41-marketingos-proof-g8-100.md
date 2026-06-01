# Amendment 41: MarketingOS SSOT Foundation Proof - Gap G8-100

**Signal requiring follow-through:** This document — SSOT foundation.

This blueprint note addresses a critical proof gap in establishing the Single Source of Truth (SSOT) foundation for MarketingOS, specifically focusing on the programmatic verification of core marketing entity data consistency and accessibility within the designated SSOT layer.

---

### 1. Exact Missing Implementation or Proof Gap

The current state lacks a robust, automated mechanism to programmatically assert that the MarketingOS SSOT data layer consistently provides accurate, up-to-date, and complete data for key marketing entities, specifically `MarketingCampaign` records. The gap is the absence of a dedicated verification routine that queries the SSOT and validates the integrity and consistency of a representative `MarketingCampaign` record against expected schema and known source data patterns.

### 2. Smallest Safe Build Slice to Close It

Implement a new, isolated verification utility function (`verifyMarketingCampaignSSOT`) that:
*   Connects to the MarketingOS SSOT data store (e.g., a specific database or API endpoint).
*   Queries for a predefined, representative `MarketingCampaign` record by a known identifier (e.g., `campaignId: 'test-campaign-g8-100'`).
*   Performs schema validation and data consistency checks on the retrieved record.
*   Reports success or failure with detailed diagnostics.

This utility should be runnable as a standalone script or callable from an existing health check/monitoring service, without modifying core MarketingOS business logic or user-facing features.

### 3. Exact Safe-Scope Files to Touch First

*   `src/utils/marketingOsSsotVerifier.js` (new file)
*   `src/config/marketingOsSsot.js` (new file for SSOT endpoint/credentials, if not already present in `src/config/index.js`)
*   `package.json` (add a new script entry for running the verifier, e.g., `"verify:marketing-ssot": "node src/utils/marketingOsSsotVerifier.js"`)

### 4. Verifier/Runtime Checks

The `verifyMarketingCampaignSSOT` function will perform the following checks:

*   **SSOT Connectivity:** Successfully establish a connection to the configured MarketingOS SSOT data endpoint.
*   **Entity Retrieval:** Successfully retrieve a `MarketingCampaign` record using the predefined `campaignId`.
*   **Schema Validation:** Assert that the retrieved `MarketingCampaign` object conforms to the expected schema (e.g., `campaignId` is string, `name` is string, `status` is enum, `startDate` is valid date, `budget` is number).
*   **Data Consistency:**
    *   Verify that `campaignId` matches the requested ID.
    *   Verify that `status` is one of the expected active states (e.g., 'ACTIVE', 'PAUSED').
    *   Verify that `lastUpdated` timestamp is recent (e.g., within the last 24 hours).
    *   (Optional, if source data access is safe-scoped) Compare a key attribute (e.g., `budget`) against a known value from the primary source system for `test-campaign-g8-100`.
*   **Error Handling:** Gracefully handle connection errors, data not found, and schema mismatches, providing clear error messages.

### 5. Stop Conditions if Runtime Truth Disagrees

The verification process should immediately stop and report failure if any of the following conditions are met:

*   **SSOT Unreachable:** The SSOT data endpoint cannot be reached or authentication fails.
*   **Entity Not Found:** The `MarketingCampaign` record with `campaignId: 'test-campaign-g8-100'` is not found in the SSOT.
*   **Schema Mismatch:** The retrieved `MarketingCampaign` record deviates from the expected schema (e.g., missing required fields, incorrect data types).
*   **Critical Data Inconsistency:** Key attributes (e.g., `status`, `lastUpdated`) do not meet the defined consistency criteria.
*   **Performance Degradation:** The query to retrieve the `MarketingCampaign` record exceeds a predefined latency threshold (e.g., > 500ms).