### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane Remediation (G185-100)

This document outlines the remediation plan and proof for closing the identified gaps in Amendment 46, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js` as per the BuilderOS control plane requirements.

#### 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to correctly integrate with the BuilderOS control plane's build lifecycle management. Specifically:
-   The `POST /build/start` endpoint is missing the internal call to `recordBuildStart` with the required `task_id`, `blueprint_id`, and `model_used` parameters.
-   The `POST /build/complete` endpoint is missing the internal call to `recordBuildComplete` with the build token and OIL receipt IDs.
-   The `POST /build/complete` endpoint lacks the necessary health check and conditional 409 response logic based on `canMarkBuildDone` when the system health is RED.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying only the `routes/lifeos-council-builder-routes.js` file and potentially a new utility or service file if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not yet defined or exposed. Given the instruction to "wire" these, it implies these functions either exist or need to be created as internal BuilderOS control plane functions. For this remediation, we assume they are internal functions within the BuilderOS domain, accessible from the routes.

#### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their respective handlers, incorporating the calls to `recordBuildStart`, `recordBuildComplete`, and the `canMarkBuildDone` check.
-   `services/build-control-plane.js` (ASSUMPTION): A new or existing internal service file to house the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. This keeps the route handlers clean and business logic separated. If these functions already exist elsewhere, we would import them from their current location. For this proof, we assume a dedicated service for BuilderOS control plane logic.

#### 4. Verifier/Runtime Checks

**Verifier Checks (Static Analysis):**
-   **Route Definition:** Verify `POST /build/start` and `POST /build/complete` are correctly defined in `routes/lifeos-council-builder-routes.js`.
-   **Parameter Validation:** Ensure `task_id`, `blueprint_id`, `model_used` are extracted and passed to `recordBuildStart`. Ensure `token` and `oil_receipt_ids` are extracted and passed to `recordBuildComplete`.
-   **Function Calls:** Confirm `recordBuildStart` and `recordBuildComplete` are called within their respective route handlers.
-   **Conditional Logic:** Verify the `canMarkBuildDone` check is present before `recordBuildComplete` and correctly returns a 409 status if it fails when health is RED.
-   **Imports:** Check for correct imports of `buildControlPlaneService` (or equivalent) and any health status utilities.

**Runtime Checks (Integration/E2E Tests):**
-   **`/build/start` Success:**
    -   Send `POST /build/start` with valid `task_id`, `blueprint_id`, `model_used`.
    -   Expect 200 OK.
    -   Verify `recordBuildStart` was called with correct parameters (e.g., via mocks or logs).
    -   Verify corresponding entry in BuilderOS internal state/DB.
-   **`/build/complete` Success:**
    -   Simulate a build in progress (e.g., by calling `/build/start` first).
    -   Ensure `canMarkBuildDone` returns true (or mock it).
    -   Send `POST /build/complete` with valid `token` and `oil_receipt_ids`.
    -   Expect 200 OK.
    -   Verify `recordBuildComplete` was called with correct parameters.
    -   Verify BuilderOS internal state reflects build completion.
-   **`/build/complete` Health RED Failure:**
    -   Simulate a build in progress.
    -   Force `canMarkBuildDone` to return false when health is RED (or mock it).
    -   Send `POST /build/complete` with valid `token` and `oil_receipt_ids`.
    -   Expect 409 Conflict.
    -   Verify `recordBuildComplete` was *not* called.
    -   Verify BuilderOS internal state remains unchanged (build not marked complete).

#### 5. Stop Conditions if Runtime Truth Disagrees

-   **Incorrect HTTP Status Codes:** If `/build/start` or `/build/complete` do not return 200 OK on success, or 409 on `canMarkBuildDone` failure (health RED), stop.
-   **Missing Internal Function Calls:** If `recordBuildStart` or `recordBuildComplete` are not invoked, or invoked with incorrect parameters, stop.
-   **Incorrect State Transitions:** If the BuilderOS internal state (e.g., build status in DB) does not reflect the expected changes after `start` or `complete` calls, stop.
-   **Unintended Side Effects:** If any LifeOS user features or TSOS customer-facing surfaces are inadvertently modified or impacted, stop immediately.
-   **Verifier Rejection:** If the verifier rejects the changes for any reason (e.g., syntax, security, scope violation), stop and re-evaluate the implementation.