<!-- SYNOPSIS: AMENDMENT_41_MARKETINGOS Proof - G1085-100 -->

# AMENDMENT_41_MARKETINGOS Proof - G1085-100

## 1. Exact Missing Implementation or Proof Gap

The current state lacks a dedicated, automated, and observable runtime signal confirming the successful, continuous operation of the MarketingOS integration as defined by `AMENDMENT_41_MARKETINGOS.md`. Specifically, there is no direct programmatic endpoint or metric that reports the health and recent activity of the data flow or event processing between LifeOS and MarketingOS, making it difficult to prove the amendment's implementation is live and functional without manual inspection or log analysis.

## 2. Smallest Safe Build Slice to Close It

Introduce a new, lightweight health check endpoint within the existing LifeOS health monitoring infrastructure. This endpoint will query the MarketingOS integration service to confirm its ability to connect to MarketingOS and, if applicable, report the timestamp of the last successful data exchange or event processed. This provides a direct, real-time proof of life and basic functionality.

## 3. Exact Safe-Scope Files to Touch First

*   `src/routes/health.js`: Extend the existing health router to include a new `/marketingos` sub-route.
*   `src/services/marketingosService.js`: Add a new function, `getMarketingOSIntegrationStatus()`, which performs a minimal, non-mutating check (e.g., pinging the MarketingOS API, checking internal queue status, or retrieving the last successful operation timestamp from a local cache/DB).
*   `src/config/featureFlags.js` (if applicable): Potentially add a feature flag to enable/disable this specific health check, though for a proof, it should be enabled by default.

## 4. Verifier/Runtime Checks

1.  **HTTP Endpoint Check:** Perform an HTTP GET request to `/health/marketingos`.
    *   Expected outcome: HTTP `200 OK` response with a JSON payload similar to:
        ```json
        {
          "status": "operational",
          "service": "MarketingOS Integration",
          "lastSuccessfulEventTimestamp": "2023-10-27T10:30:00Z",
          "details": "Connected to MarketingOS API, events flowing."
        }
        ```
    *   A `status` of `degraded` or `non-operational` would indicate a problem.
2.  **Log Monitoring:** Verify that the `marketingosService` logs indicate successful execution of the `getMarketingOSIntegrationStatus()` function without errors.
3.  **Metric Dashboard (if applicable):** If a metric is exposed (e.g., `marketingos_integration_status_gauge`), ensure it consistently reports a healthy value.

## 5. Stop Conditions if Runtime Truth Disagrees

*   The `/health/marketingos` endpoint returns any HTTP status code other than `200 OK`.
*   The `/health/marketingos` endpoint returns `200 OK` but the `status` field in the JSON payload is `degraded` or `non-operational`.
*   The `lastSuccessfulEventTimestamp` in the payload is significantly stale (e.g., older than 5 minutes, depending on expected event frequency).
*   Error logs related to `marketingosService.js` or the MarketingOS integration are observed to be increasing or consistently present.
*   The endpoint is unreachable or times out.