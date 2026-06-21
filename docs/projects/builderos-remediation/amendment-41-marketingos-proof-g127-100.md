<!-- SYNOPSIS: AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G127-100) -->

# AMENDMENT_41_MARKETINGOS: Proof-Closing Blueprint Note (G127-100)

**Signal:** This document — SSOT foundation.

## 1. Exact Missing Implementation or Proof Gap

The exact gap (G127-100) is the verified end-to-end delivery and structural integrity of the `build_completion_report` payload from BuilderOS to the designated MarketingOS ingestion endpoint following a successful build event. This includes ensuring the payload conforms to the `MarketingOSBuildReportSchema` and that MarketingOS successfully acknowledges receipt.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **BuilderOS Report Generation Verification:** Confirming the `build_completion_report` is correctly generated within BuilderOS upon a `BUILD_SUCCESS` event, containing `project_id`, `build_id`, `status: 'completed'`, and `output_url`.
2.  **BuilderOS Integration Service Call:** Verifying the `MarketingOSIntegrationService` in BuilderOS successfully constructs and dispatches an HTTP POST request with the generated report to the configured MarketingOS endpoint.
3.  **MarketingOS Endpoint Acknowledgment:** Confirming the MarketingOS endpoint receives the payload, validates its structure, and returns an HTTP 200 OK status, indicating successful ingestion.

This slice focuses solely on the data transmission and acknowledgment, not on subsequent processing within MarketingOS.

## 3. Exact Safe-Scope Files to Touch First

*   `src/services/build-reporter.js`: Review/verify the `generateBuildCompletionReport` function.
*   `src/services/marketingos-integrator.js`: Implement/verify the `sendBuildReport` function, including HTTP client logic.
*   `src/config/integrations.js`: Verify the `MARKETINGOS_REPORT_ENDPOINT` configuration.
*   `src/events/build-event-handler.js`: Ensure the `BUILD_SUCCESS` event triggers `marketingosIntegrator.sendBuildReport`.
*   `tests/unit/marketingos-integrator.test.js`: Add/update unit tests for `sendBuildReport` covering payload structure and HTTP call.
*   `tests/integration/build-marketingos.test.js`: Add/update integration tests simulating a `BUILD_SUCCESS` event and asserting successful report delivery to a mock MarketingOS endpoint.

## 4. Verifier/Runtime Checks

*   **BuilderOS Logs:** Monitor `BuilderOS` service logs for `INFO` level messages indicating successful dispatch of `build_completion_report` to MarketingOS, including the HTTP status code (expected: 200). Look for `DEBUG` level logs showing the exact payload sent.
*   **MarketingOS Ingestion Logs:** Access `MarketingOS` ingestion service logs to confirm receipt of `build_completion_report` payloads, verifying the `project_id`, `build_id`, `status`, and `output_url` fields match expectations.
*   **Network Monitoring:** Use network monitoring tools (e.g., `tcpdump`, `Wireshark` or cloud-native equivalents) to observe HTTP POST requests from BuilderOS to MarketingOS, confirming payload structure and headers.
*   **Metrics:** Monitor `marketingos_integration_success_total` and `marketingos_integration_failure_total` metrics in BuilderOS.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **HTTP Errors:** If BuilderOS logs show non-2xx HTTP status codes (e.g., 4xx, 5xx) from the MarketingOS endpoint for `build_completion_report` dispatches.
*   **Missing Payloads:** If MarketingOS ingestion logs do not show corresponding `build_completion_report` entries for successful BuilderOS builds.
*   **Payload Mismatch:** If MarketingOS logs show received payloads with incorrect structure, missing required fields, or invalid data types compared to `MarketingOSBuildReportSchema`.
*   **Latency Exceedance:** If the observed end-to-end latency for report delivery (from BuilderOS `BUILD_SUCCESS` to MarketingOS ingestion acknowledgment) consistently exceeds 500ms.
*