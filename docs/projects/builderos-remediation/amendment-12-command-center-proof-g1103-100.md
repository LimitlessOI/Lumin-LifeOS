<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G1103 100. -->

Amendment 12: Command Center Integration - Proof G1103-100
This document outlines the proof-closing blueprint note for the initial build slice of Phase 1: Telemetry Ingestion & Basic Display (G1103-100), focusing on `lifeos-core` service health metrics.

1.  **Exact missing implementation or proof gap:**
    The `lifeos-core` service currently lacks a standardized, discoverable HTTP endpoint for exposing its current operational health metrics (e.g., uptime, memory usage, request latency). This prevents the Command Center from reliably ingesting and displaying `lifeos-core`'s health status, which is critical for Phase 1: Telemetry Ingestion & Basic Display.

2.  **Smallest safe build slice to close it:**
    Implement a `/metrics/health` HTTP GET endpoint within the `lifeos-core` service. This endpoint will return a JSON payload containing essential service health indicators such as `status: "ok"`, `uptime` (in seconds), and `memoryUsage` (details like `rss`, `heapTotal`, `heapUsed`). This endpoint must be accessible on the service's primary HTTP port.

3.  **Exact safe-scope files to touch first:**
    *   `lifeos-core/src/app.js` (or `lifeos-core/src/server.js`): To register the new `/metrics/health` route and integrate the health module.
    *   `lifeos-core/src/metrics/health.js`: New file to encapsulate the health metric collection logic and endpoint handler.
    *   `lifeos-core/test/unit/metrics/health.test.js`: New file for unit tests covering the health metric data collection functions.
    *   `lifeos-core/test/integration/health-endpoint.test.js`: New file for integration tests verifying the `/metrics/health` endpoint's accessibility and response structure.

4.  **Verifier/runtime checks:**
    *   **Unit Tests:** Execution of `npm test lifeos-core/test/unit/metrics/health.test.js` must pass, ensuring the underlying health metric collection logic is robust and accurate.
    *   **Integration Tests:** Execution of `npm test lifeos-core/test/integration/health-endpoint.test.js` must pass, verifying the `/metrics/health` endpoint is reachable, returns a `200 OK` status, and provides a valid JSON structure.
    *   **Runtime Check (Manual/Automated):** After deployment of the `lifeos-core` service, a `curl http://lifeos-core-service:PORT/metrics/health` command must return a `200 OK` status and a JSON body similar to `{"status": "ok", "uptime": 12345, "memoryUsage": {"rss": ..., "heapTotal": ..., "heapUsed": ...}}`.

5.  **Stop conditions if runtime truth disagrees:**
    *   The `/metrics/health` endpoint is not reachable (e.g., returns a 404 Not Found, 500 Internal Server Error, or connection refused).
    *   The endpoint returns a non-200 HTTP status code when the service is otherwise operational.
    *   The returned payload is not valid JSON or is missing the critical `status`, `uptime`, or `memoryUsage` fields.
    *   The `status` field in the JSON payload is not `"ok"` when the service is expected to be healthy.