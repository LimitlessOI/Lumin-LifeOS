# Amendment 41: MarketingOS Proof - G75-100 (SSOT Foundation)

## Proof-Closing Blueprint Note

This document outlines the necessary steps to establish MarketingOS as the Single Source of Truth (SSOT) for LifeOS-generated user events, specifically focusing on the `g75-100` event ingestion stream. The current gap is the lack of explicit, verifiable acknowledgment of event ingestion by MarketingOS, which is critical for SSOT validation.

### 1. Exact Missing Implementation or Proof Gap

The current implementation sends user events to MarketingOS via an API, but lacks a robust, real-time mechanism to confirm successful ingestion and processing by MarketingOS. This prevents LifeOS from definitively asserting that MarketingOS holds the SSOT for these events, as there's no direct feedback loop to reconcile sent vs. ingested events. The gap is the absence of a verifiable acknowledgment and reconciliation layer for event ingestion.

### 2. Smallest Safe Build Slice to Close It

Enhance the existing event dispatch mechanism to capture and log the explicit API response from MarketingOS for each event ingestion attempt. Introduce a new metric to track successful and failed ingestion attempts based on these responses. This slice focuses on immediate feedback capture without introducing complex asynchronous reconciliation jobs initially.

### 3. Exact Safe-Scope Files to Touch First

*   `src/services/marketingosEventService.js`: Modify the `dispatchEvent` (or similar) function to:
    *   Await the MarketingOS API response.
    *   Inspect the HTTP status code and response body for success/failure indicators.
    *   Log the outcome (success/failure) with relevant details (event ID, MarketingOS response code/message).
    *   Increment appropriate metrics.
*   `src/utils/logger.js`: Ensure the logger supports structured logging for event ingestion outcomes.
*   `src/metrics/marketingosMetrics.js`: Add new Prometheus/OpenTelemetry metrics:
    *   `marketingos_event_ingest_success_total`: Counter for successfully ingested events.
    *   `marketingos_event_ingest_failure_total`: Counter for failed event ingestion attempts (categorized by error type if possible, e.g., network, API error, validation error).
*   `src/config/marketingos.js`: Potentially update API endpoint configuration if specific acknowledgment endpoints are introduced by MarketingOS, though for this slice, it's assumed the existing event ingestion endpoint will provide the necessary response.

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   Verify `marketingosEventService.dispatchEvent` correctly parses and logs various MarketingOS API responses (200 OK, 400 Bad Request, 500 Internal Server Error).
    *   Assert that success/failure metrics are incremented appropriately based on mock API responses.
*   **Integration Tests:**
    *   Send a known test event through the LifeOS system.
    *   Assert that `marketingos_event_ingest_success_total` increments.
    *   Verify logs contain a "MarketingOS event ingestion successful" message for the test event.
    *   (If MarketingOS provides a testable query API) Query MarketingOS to confirm the presence and correctness of the ingested test event.
*   **Monitoring:**
    *   Dashboard `marketingos_event_ingest_success_total` and `marketingos_event_ingest_failure_total` metrics.
    *   Monitor log streams for `MarketingOS event ingestion successful` and `MarketingOS event ingestion failed` messages.
    *   Set up alerts for:
        *   Sudden drops in `marketingos_event_ingest_success