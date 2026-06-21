<!-- SYNOPSIS: Documentation — Amendment 12 Command Center Proof G86 100. -->

Blueprint Note: Amendment 12 - Command Center Proof G86-100

This note closes the proof for the initial Command Center heartbeat reception mechanism, as specified in Amendment 12, focusing on the `g86-100` slice.

1.  **Exact missing implementation or proof gap:**
    The current gap is the absence of a dedicated `apiEP` for the Command Center to receive `heartbeat` signals from BuilderOS agents. This includes the endpoint definition, request validation schema, and a minimal handler to acknowledge receipt and log the event.

2.  **Smallest safe build slice to close it:**
    Define and implement the `/builder-os/v1/heartbeat` API endpoint. This slice includes:
    *   Route definition for `POST /builder-os/v1/heartbeat`.
    *   Request body schema validation (e.g., `agentId: string`, `timestamp: ISOString`, `status: string`).
    *   A controller function that logs the heartbeat payload and returns a `202 Accepted` response.
    *   Integration of this new route into the existing BuilderOS API router.

3.  **Exact safe-scope files to touch first:**
    *   `src/builder-os/api/v1/heartbeat/heartbeat.route.js` (new file)
    *   `src/builder-os/api/v1/heartbeat/heartbeat.controller.js` (new file)
    *   `src/builder-os/schemas/heartbeat.schema.js` (new file)
    *   `src/builder-os/api/v1/index.js` (to register the new heartbeat route)
    *   `src/builder-os/tests/api/v1/heartbeat.test.js` (new file for unit/integration tests)

4.  **Verifier/runtime checks:**
    *   **Unit Test:** `POST /builder-os/v1/heartbeat` with a valid payload returns `202 Accepted`.
    *   **Unit Test:** `POST /builder-os/v1/heartbeat` with an invalid payload (e.g., missing `agentId`) returns `400 Bad Request` with schema validation errors.
    *   **Integration Test:** A simulated BuilderOS agent successfully sends a heartbeat, and the Command Center logs its receipt without errors.
    *   **System Health:** Monitor Command Center service logs for unexpected errors or increased resource consumption post-deployment.

5.  **Stop conditions if runtime truth disagrees:**
    *   The `/builder-os/v1/heartbeat` endpoint is unreachable or returns unexpected HTTP status codes (e.g., 5xx for valid requests).
    *   Valid heartbeat payloads are rejected due to schema validation issues not related to the payload itself.
    *   The Command Center service experiences crashes, memory leaks, or significant performance degradation.
    *   Any existing BuilderOS or LifeOS functionality is negatively impacted or fails.