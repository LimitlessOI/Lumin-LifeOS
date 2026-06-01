# AMENDMENT 12: COMMAND CENTER - Proof G85-100 (Core Monitoring)

This document outlines the proof-closing blueprint note for the initial build slice of Amendment 12, focusing on the `GET /builds/active` API endpoint as part of the G85-100 Core Monitoring phase.

---

**1. Exact missing implementation or proof gap:**
The `GET /builds/active` API endpoint, which provides a list of currently active BuilderOS builds, is not yet implemented. This endpoint is foundational for the Command Center's dashboard and requires integration with BuilderOS's internal build state tracking.

**2. Smallest safe build slice to close it:**
Implement the `GET /builds/active` API endpoint within the BuilderOS internal API. This slice will:
    *   Define the API route.
    *   Create a controller function to handle requests.
    *   Query the existing BuilderOS build state management system to identify and retrieve active build instances.
    *   Format the retrieved active build data into a standardized JSON array of build objects.

**3. Exact safe-scope files to touch first:**
*   `src/builderos/api/routes/buildsRoutes.js`: Add the `GET /builds/active` route definition.
*   `src/builderos/api/controllers/buildsController.js`: Implement the `getActiveBuilds` controller function.
*   `src/builderos/core/buildStateManager.js`: (Existing) Ensure this module exposes a method to retrieve active builds (e.g., `getCurrentlyActiveBuilds()`). If not, extend it to do so.
*   `src/builderos/types/build.js`: (Existing or New) Define or update the `Build` type interface for consistent data serialization.

**4. Verifier/runtime checks:**
*   **Unit Tests:**
    *   Verify `buildsController.getActiveBuilds` correctly calls `buildStateManager.getCurrentlyActiveBuilds`.
    *   Verify `buildsController.getActiveBuilds` correctly formats various states of active build data (e.g., empty, single build, multiple builds).
*   **Integration Tests:**
    *   Send a `GET /builds/active` request to the BuilderOS API.
    *   Assert a 200 OK response.
    *   Assert the response body is a JSON array.
    *   Assert each object in the array contains expected fields (e.g., `id`, `status`, `startTime`, `blueprintId`).
*   **Manual Verification:**
    *   Initiate one or more builds via BuilderOS.
    *   Access the `GET /builds/active` endpoint directly (e.g., via `curl` or browser).
    *   Confirm the initiated builds appear in the response with correct details.
    *   Allow a build to complete or stop it.
    *   Re-check the endpoint; confirm the completed/stopped build is no longer present.

**5. Stop conditions if runtime truth disagrees:**
*   The `GET /builds/active` endpoint returns any HTTP status code other than 200 OK.
*   The response payload is not a valid JSON array, or individual build objects within the array are missing critical fields (`id`, `status`, `startTime`, `blueprintId`).
*   Active builds initiated in BuilderOS do not appear in the endpoint's response within a reasonable timeframe (e.g., 5 seconds).
*   Completed or stopped builds continue to appear in the `active`