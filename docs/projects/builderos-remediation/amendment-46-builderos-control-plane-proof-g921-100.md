<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G921 100. -->

Amendment 46: BuilderOS Control Plane Proof - G921-100
This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, detailing the implementation plan and verification steps for wiring the BuilderOS control plane routes.

**1. Exact Missing Implementation or Proof Gap**
The primary gap is the absence of wired routes in `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. Specifically:
-   A `POST` endpoint for `/build/start` to trigger `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST` endpoint for `/build/complete` to trigger `recordBuildComplete` with a token and OIL receipt IDs.
-   Conditional logic within the `/build/complete` flow to check `canMarkBuildDone` and return a `409 Conflict` if the health is RED.

**2. Smallest Safe Build Slice to Close It**
Implement the two distinct `POST` endpoints within `routes/lifeos-council-builder-routes.js` to handle build start and completion events. This involves:
-   Defining route handlers that parse incoming request bodies for `task_id`, `blueprint_id`, `model_used`, `token`, and `oil_receipt_ids`.
-   Calling the respective internal `recordBuildStart` and `recordBuildComplete` functions.
-   Integrating the `canMarkBuildDone` check before `recordBuildComplete` and handling the `409` response.

**3. Exact Safe-Scope Files to Touch First**
-   `routes/lifeos-council-builder-routes.js`: Add the new `POST /build/start` and `POST /build/complete` route definitions and their handlers.
-   `services/builder-control-plane-service.js` (or similar existing BuilderOS service): Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions are defined and exportable. If they don't exist, create stub implementations within this file.

**4. Verifier/Runtime Checks**
-   **Unit Tests:**
    -   Verify `recordBuildStart` is called with correct parameters on `/build/start`.
    -   Verify `recordBuildComplete` is called with correct parameters on `/build/complete` when `canMarkBuildDone` is green.
    -   Verify `409` response is returned on `/build/complete` when `canMarkBuildDone` is red.
-   **Integration Tests:**
    -   Send `POST /build/start` requests and confirm 200 OK and expected side effects (e.g., database entry for build start).
    -   Send `POST /build/complete` requests (simulating green health) and confirm 200 OK and expected side effects (e.g., database entry for build completion).
    -   Send `POST /build/complete` requests (simulating red health) and confirm 409 Conflict response.
-   **OIL Verifier:** Re-run the OIL verifier against the updated codebase to ensure compliance and absence of new syntax or architectural violations.

**5. Stop Conditions if Runtime Truth Disagrees**
-   If `POST /build/start` or `POST /build/complete` routes return unexpected HTTP status codes (e.g., 500, 400 for valid requests).
-   If internal `recordBuildStart` or `recordBuildComplete` functions fail to persist build state correctly.
-   If the `canMarkBuildDone` check does not correctly gate `recordBuildComplete` or incorrectly returns 409 when health is green.
-   If the OIL verifier flags new issues or re-flags the original syntax error (indicating a deeper verifier configuration problem or an actual syntax error introduced).
-   If any existing BuilderOS or LifeOS functionality is observed to be degraded or altered.