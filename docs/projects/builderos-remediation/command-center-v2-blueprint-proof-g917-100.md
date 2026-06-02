### Proof-Closing Blueprint Note: Command Center V2 - Build Slice G917-100

This note addresses the initial build slice for Command Center V2, focusing on establishing a foundational API endpoint for BuilderOS internal status. This slice aims to prove the basic routing and accessibility of a new V2 API surface.

1.  **Exact Missing Implementation or Proof Gap:**
    The core gap is the absence of a dedicated, versioned API endpoint within BuilderOS for Command Center V2 to retrieve a consolidated list of active build processes and their high-level statuses. This endpoint is crucial for enabling any V2 UI or automated tooling to monitor BuilderOS operations without directly querying underlying data stores or legacy V1 endpoints. Specifically, a `GET /builder-os/v2/builds` endpoint is needed to provide a list of current build states.

2.  **Smallest Safe Build Slice to Close It:**
    Implement a new `GET /builder-os/v2/builds` API endpoint. This endpoint will initially return a static or mocked list of build IDs and their statuses (e.g., `RUNNING`, `COMPLETED`, `FAILED`). The goal is to establish the route, basic request/response structure, and ensure it's accessible within the BuilderOS internal network. No complex data fetching or business logic is required in this first slice beyond proving the endpoint's existence and basic functionality. This ensures the API surface is present and responds correctly before integrating with actual build state management.

3.  **Exact Safe-Scope Files to Touch First:**
    *   `src/builder-os/api/v2/builds.js`: New file for the V2 builds API handler, containing the `GET /` route logic.
    *   `src/builder-os/api/v2/index.js`: New file to consolidate V2 API routes, importing `builds.js` and exporting a V2 router.
    *   `src/builder-os/api/router.js`: Existing main BuilderOS API router file. This file will be modified to import and register the new `/v2` router.
    *   `src/builder-os/types/build.js`: New or existing file to define a basic `BuildStatus` enum or JSDoc type for consistency.

4.  **Verifier/Runtime Checks:**
    *   **API Endpoint Reachability:** Execute `curl -X GET http://localhost:PORT/builder-os/v2/builds` (replace `PORT` with the BuilderOS API port). Expected outcome: HTTP 200 OK status and a JSON array response.
    *   **Schema Validation (Basic):** The returned JSON array should contain objects with at least `id` (string) and `status` (string) fields. Example: `[{ "id": "build-abc", "status": "RUNNING" }]`.
    *   **No Side Effects:** Verify that repeated calls to this endpoint do not alter any BuilderOS state, trigger any operations, or consume excessive resources.
    *   **Logging:** Confirm that a request to this endpoint generates appropriate access logs within BuilderOS's internal logging system.

5.  **Stop Conditions if Runtime Truth Disagrees:**
    *   If the endpoint returns a 4xx or 5xx HTTP error, indicating a routing, authentication, or server-side issue.
    *   If the endpoint is not reachable at the specified path (`/builder-os/v2/builds`).
    *   If the response is not valid JSON, or if the JSON schema fundamentally deviates from the expected minimal structure (e.g., missing `id` or `status` fields).
    *   If the endpoint unexpectedly triggers any BuilderOS actions, modifies state, or causes system instability.
    *   If the endpoint exposes any sensitive information not intended for this initial, internal-only slice.