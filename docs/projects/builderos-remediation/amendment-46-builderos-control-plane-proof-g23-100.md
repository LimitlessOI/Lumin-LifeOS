Amendment 46: BuilderOS Control Plane - Proof G23-100
Proof-Closing Blueprint Note: Builder Control Plane Route Wiring
This note addresses the signal requiring follow-through for wiring `routes/lifeos-council-builder-routes.js` as part of Amendment 46, focusing on the BuilderOS-only governed loop execution without modifying LifeOS user features.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the complete wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js` to manage the BuilderOS build lifecycle. This includes:
-   Handling `POST /build/start` to initiate a build record by calling `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   Handling `POST /build/complete` to finalize a build record by calling `recordBuildComplete` with a token and OIL receipt IDs.
-   Implementing a health check mechanism for `POST /build/complete` that returns a `409 Conflict` if `canMarkBuildDone` fails when the system health is RED.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding new POST route handlers to `routes/lifeos-council-builder-routes.js`. These handlers will import and call existing internal functions: `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. No new core logic or data models are introduced; existing platform capabilities are leveraged.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`

### 4. Verifier/Runtime Checks

-   **`POST /build/start`:**
    -   Send a POST request to `/build/start` with a JSON body containing `task_id`, `blueprint_id`, and `model_used`.
    -   Verify that `recordBuildStart` is invoked with the correct parameters.
    -   Verify a successful (e.g., 200 OK or 201 Created) response is returned.
-   **`POST /build/complete` (Success Path):**
    -   Send a POST request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids`.
    -   Ensure `canMarkBuildDone` returns `true` (simulating a healthy state).
    -   Verify that `recordBuildComplete` is invoked with the correct parameters.
    -   Verify a successful (e.g., 200 OK) response is returned.
-   **`POST /build/complete` (Health RED Path):**
    -   Send a POST request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids`.
    -   Ensure `canMarkBuildDone` returns `false` (simulating a health RED state).
    -   Verify that a `409 Conflict` status code is returned.
    -   Verify that `recordBuildComplete` is *not* invoked.
-   **Isolation Check:**
    -   Run existing LifeOS user feature tests and TSOS customer-facing surface tests to confirm no regressions or unintended side effects.

### 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` functions are not found or have incompatible signatures, indicating a missing dependency or incorrect assumption about the existing API.
-   If the `/build` endpoints conflict with existing routes or introduce unexpected behavior in other parts of the system.
-   If the health check mechanism (`canMarkBuildDone`) does not correctly gate `recordBuildComplete` based on system health status.
-   If any LifeOS user features or TSOS customer-facing surfaces exhibit regressions or altered behavior.