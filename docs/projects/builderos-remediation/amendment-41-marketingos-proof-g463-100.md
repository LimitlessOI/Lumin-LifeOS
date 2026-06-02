# Amendment 41: MarketingOS Proof - G463-100 - BuilderOS Remediation

This document serves as the SSOT foundation for closing the proof gap identified in Amendment 41, specifically for goal G463-100, concerning the secure and isolated exposure of BuilderOS-derived marketing performance data to MarketingOS.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS platform lacks a verified, dedicated internal API endpoint to expose the aggregated "BuilderOS Campaign Engagement Score" (BCES) to the MarketingOS system. While raw data exists within BuilderOS, the specific aggregation logic and a secure, BuilderOS-only endpoint for MarketingOS consumption are not yet implemented and verified. This gap prevents MarketingOS from accurately assessing the performance of campaigns managed exclusively within BuilderOS without direct access to LifeOS user data, adhering to the BuilderOS-only governed loop execution.

### 2. Smallest Safe Build Slice to Close It

Implement a new internal BuilderOS service and API route that:
a. Aggregates campaign interaction data from BuilderOS-managed campaigns.
b. Calculates the "BuilderOS Campaign Engagement Score" based on predefined BuilderOS-specific metrics (e.g., clicks, impressions, unique views within the BuilderOS context).
c. Exposes this aggregated score via a new, authenticated, internal BuilderOS API endpoint.
This slice ensures no modification to LifeOS user features or TSOS customer-facing surfaces, operating strictly within the BuilderOS domain.

### 3. Exact Safe-Scope Files to Touch First

*   `services/builder-marketing-data.js`: New service file for BCES aggregation logic.
*   `routes/internal/marketing-metrics.js`: New internal API route definition for `/builderos/metrics/campaign-engagement`.
*   `controllers/internal/marketing-metrics-controller.js`: New controller to handle requests for the BCES endpoint, utilizing `builder-marketing-data.js`.
*   `tests/unit/services/builder-marketing-data.test.js`: Unit tests for the new service.
*   `tests/integration/routes/internal/marketing-metrics.test.js`: Integration tests for the new API endpoint.

### 4. Verifier/Runtime Checks

1.  **Unit Test Verification:** All tests in `tests/unit/services/builder-marketing-data.test.js` pass, covering various aggregation scenarios and edge cases for BCES calculation.
2.  **Integration Test Verification:** All tests in `tests/integration/routes/internal/marketing-metrics.test.js` pass, confirming the API endpoint is accessible, returns the correct data structure, and applies appropriate authentication/authorization for internal BuilderOS access.
3.  **Manual API Call (Staging/Dev):**
    *   Execute an authenticated GET request to `/builderos/metrics/campaign-engagement`.
    *   Expected response: JSON object containing `campaignEngagementScore` (number) and `timestamp` (ISO string).
    *   Example: `{"campaignEngagementScore": 78.5, "timestamp": "2023-10-27T10:00:00Z"}`
4.  **Data Consistency Check:** Verify that the `campaignEngagementScore` returned by the API aligns with manual calculations based on a sample set of BuilderOS campaign interaction data.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If unit or integration tests fail, indicating incorrect logic or API behavior.
*   If the API endpoint is inaccessible, returns an incorrect status code (e.g., 4xx, 5xx), or an unexpected data format.
*   If the `campaignEngagementScore` value returned by the API significantly deviates from expected values based on source BuilderOS data, suggesting an aggregation error or data source issue.
*   If any attempt to access or modify LifeOS user features or TSOS customer-facing surfaces is detected during implementation or testing, immediately halt and re-evaluate scope.