<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G173 100. -->

Amendment 12: Command Center Proof - G173-100
Blueprint Note: System Metric Ingestion Endpoint - Basic API Implementation

This note closes the proof for the build slice concerning the implementation of a basic API endpoint for ingesting system metrics, as outlined in Phase 2: Metric Ingestion Pipeline of `docs/projects/AMENDMENT_12_COMMAND_CENTER.md`.

**1. Exact Missing Implementation or Proof Gap:**
The previous slice established the system metric data model and basic persistence mechanisms. The current gap is the functional mechanism to receive and process incoming system metric data. This requires a dedicated ingestion endpoint or service function within BuilderOS.

**2. Smallest Safe Build Slice to Close It:**
Implement a minimal, authenticated (internal BuilderOS token/API key) HTTP POST endpoint at `/builder-os/metrics/ingest` that accepts a JSON array of system metric objects. This endpoint will validate the incoming data against the defined metric schema and then pass it to the `metric.service` for persistence.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/builder-os/metrics/metric.schema.js`: Define/refine Joi/Yup schema for incoming metric payloads, ensuring alignment with the established metric model.
*   `src/builder-os/metrics/metric.service.js`: Add an `ingestMetrics(metricsArray)` function to encapsulate business logic for validation and database insertion.
*   `src/builder-os/metrics/metric.controller.js`: Create an `ingestMetricsController` function to handle request parsing, payload validation, and calling the `metric.service`.
*   `src/builder-os/routes/builder-os.routes.js`: Register the new POST route `/builder-os/metrics/ingest` and link it to the `ingestMetricsController`.
*   `src/builder-os/middleware/auth.middleware.js`: (If not existing) Implement or extend an internal authentication middleware to secure BuilderOS endpoints.

**4. Verifier/Runtime Checks:**
*   **Unit Tests (`src/builder-os/metrics/metric.service.test.js`):**
    *   Verify `ingestMetrics` correctly processes valid metric arrays, returning success.
    *   Verify `ingestMetrics` handles invalid metric objects (e.g., missing required fields, incorrect types) by rejecting them or logging errors without crashing.
*   **Integration Tests (`src/builder-os/metrics/metric.controller.test.js`):**
    *   Simulate a POST request to `/builder-os/metrics/ingest` with a valid payload and assert a 200/201 status code and successful database entry.
    *   Simulate a POST request with an invalid payload and assert a 400 status code.
    *   Simulate a POST request without proper authentication and assert a 401/403 status code.
*   **Runtime Check (Staging BuilderOS):**
    *   Manually send a `curl` or Postman request with a valid metric payload to the deployed endpoint.
    *   Verify the metric appears in the BuilderOS metrics database.
    *   Send an invalid payload and confirm appropriate error response.
    *   Monitor BuilderOS logs for any unexpected errors or warnings related to ingestion.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If the `/builder-os/metrics/ingest` endpoint is unreachable or consistently returns 5xx errors for valid requests.
*   If valid metric data is not consistently persisted to the database after successful API calls.
*   If invalid metric data is persisted, or causes data corruption/system instability.
*   If the endpoint is accessible without proper internal BuilderOS authentication.
*   If the ingestion process introduces significant latency or resource contention within BuilderOS under expected load.
*   If the endpoint fails to handle expected load (e.g., 100 metrics/second) without degradation.