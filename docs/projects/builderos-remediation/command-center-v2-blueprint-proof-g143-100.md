# Blueprint Proof: Command Center V2 - Telemetry API Mock Integration (G143-100)

This document serves as a proof-closing blueprint note for the initial build slice of Command Center V2, focusing on establishing a foundational telemetry endpoint within the `command-center-api` using mock data. This aligns with the "Phase 1: Core Telemetry & Dashboard (MVP)" objective to "Integrate `telemetry-service` with `command-center-api`" by first proving the API structure.

---

## Blueprint Note

1.  **Exact missing implementation or proof gap:**
    The `command-center-api` lacks an endpoint to expose telemetry data. The immediate gap is the absence of a `/telemetry/latest` API route and its associated controller logic to serve basic, mock telemetry data for a LifeOS instance. This proves the API surface before actual `telemetry-service` integration.

2.  **Smallest safe build slice to close it:**
    Implement a new `GET /api/v1/telemetry/latest` endpoint in `command-center-api`. This endpoint will return a static, mock JSON object representing the latest telemetry for a single LifeOS instance. This slice is backend-only and does not require `telemetry-service` or `command-center-ui` changes, ensuring minimal scope and dependencies.

3.  **Exact safe-scope files to touch first:**
    *   `services/command-center-api/src/controllers/telemetryController.js` (new file: contains mock data and handler function)
    *   `services/command-center-api/src/routes/telemetry.js` (new file: defines the `/telemetry/latest` route)
    *   `services/command-center-api/src/app.js` (modification: registers the new telemetry router)

4.  **Verifier/runtime checks:**
    *   Ensure `command-center-api` starts successfully without errors.
    *   Execute a `GET` request to `http://localhost:<API_PORT>/api/v1/telemetry/latest`.
    *   Verify the HTTP response status code is `200 OK`.
    *   Verify the response body is valid JSON, matching the expected mock structure (e.g., `{"instanceId": "lifeos-001", "cpuUsage": 0.45, "memoryUsage": 0.60, "networkIO": {"in": 1024, "out": 512}}`).

5.  **Stop conditions if runtime truth disagrees:**
    *   If the `command-center-api` fails to start or crashes due to the new code.
    *   If the `GET /api/v1/telemetry/latest` endpoint returns a `404 Not Found` or `500 Internal Server Error`.
    *   If the response body is not valid JSON or does not contain the expected mock telemetry data structure.
    *   If the API returns an empty response or unexpected data format.