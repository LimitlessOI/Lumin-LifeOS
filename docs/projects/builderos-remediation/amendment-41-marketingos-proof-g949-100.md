# Proof-Closing Blueprint Note: Amendment 41 - MarketingOS Integration (G949-100)

This document serves as the SSOT foundation for closing the proof gap identified in `docs/projects/AMENDMENT_41_MARKETINGOS.md`.

## 1. Exact Missing Implementation or Proof Gap

The core gap is the verifiable, production-ready implementation and end-to-end proof of the `UserConsentStatusUpdate` event propagation from LifeOS to MarketingOS. Specifically, ensuring that changes to a user's marketing consent preferences within LifeOS are reliably and accurately reflected in MarketingOS, adhering to the data schema and latency requirements outlined in Amendment 41. This includes both the data transmission mechanism and the confirmation of successful processing by MarketingOS.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   **LifeOS Event Listener/Publisher:** A new or extended module within LifeOS responsible for detecting `UserConsentStatusUpdate` events (e.g., from `UserPreferencesService` or `ConsentManagementModule`).
*   **MarketingOS API Client:** A dedicated Node.js ESM module in LifeOS to encapsulate API calls to MarketingOS for consent updates, including retry logic and error handling.
*   **Data Transformation Layer:** A lightweight function to map LifeOS consent data structures to MarketingOS's expected payload format.
*   **Integration Test Suite:** A set of automated tests to simulate consent changes and verify successful transmission and (mocked) receipt by MarketingOS.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketingos/MarketingOSConsentSyncService.js` (New file): Orchestrates the detection, transformation, and transmission of consent updates.
*   `src/clients/MarketingOSAPIClient.js` (New file): Handles HTTP requests to the MarketingOS API.
*   `src/events/listeners/UserConsentUpdateListener.js` (New file or extend existing): Listens for `UserConsentStatusUpdate` events and triggers `MarketingOSConsentSyncService`.
*   `src/config/marketingos.js` (New file or extend existing): Stores MarketingOS API endpoint and authentication details.
*   `tests/integration/marketingosConsentFlow.test.js` (New file): Integration tests for the full flow.
*   `tests/unit/MarketingOSConsentSyncService.test.js` (New file): Unit tests for the sync service logic.

## 4. Verifier/Runtime Checks

*   **Automated Integration Tests:**
    *   Simulate a user opting in/out of marketing communications in LifeOS.
    *   Assert that `MarketingOSAPIClient.sendConsentUpdate` is called with the correct payload.
    *   Assert that the mock MarketingOS endpoint receives the expected data.
    *   Verify error handling paths (e.g., MarketingOS API downtime).
*   **Observability & Logging:**
    *   LifeOS logs successful transmission of `UserConsentStatusUpdate` events to MarketingOS, including user ID and consent status.
    *   LifeOS logs any errors encountered during transmission, with relevant stack traces and retry attempts.
    *   Monitoring dashboards show metrics for successful/failed consent updates sent to MarketingOS.
*   **Manual Verification (Staging/Production):**
    *   Change a test user's marketing consent in the LifeOS UI.
    *   Verify, via MarketingOS's internal tools or API, that the user's consent status is updated correctly and within the specified latency.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Integration Test Failures:** Consistent failures in `tests/integration/marketingosConsentFlow.test.js` indicate a fundamental breakdown in the data flow.
*   **High Error Rate in Logs:** A sustained increase in `MarketingOSConsentSyncService` error logs (e.g., API failures, data transformation errors) above a predefined threshold (e.g., >0.1% of attempts).
*   **Data Discrepancy Alerts:** Monitoring systems detect a significant divergence between user consent statuses in LifeOS and MarketingOS for a sample set of users (e.g., >5% mismatch).
*   **Performance Degradation:** The `MarketingOSConsentSyncService` introduces unacceptable latency or resource consumption in LifeOS, impacting core user flows.
*   **MarketingOS Rejection:** MarketingOS consistently rejects payloads due to schema mismatches or invalid data, indicating a transformation or API client issue.