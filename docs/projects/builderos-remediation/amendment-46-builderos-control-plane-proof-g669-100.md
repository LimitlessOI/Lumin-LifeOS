<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G669 100. -->

Amendment 46: BuilderOS Control Plane Proof - G669-100

Proof-Closing Blueprint Note

This document outlines the necessary steps to close the implementation gap for wiring the BuilderOS control plane routes as specified in Amendment 46.

**1. Exact Missing Implementation or Proof Gap**
The primary gap is the absence of wired API endpoints within `routes/lifeos-council-builder-routes.js` for handling `/build` start and complete events, including the conditional check for `canMarkBuildDone` and the invocation of internal `recordBuildStart` and `recordBuildComplete` functions.

**2. Smallest Safe Build Slice to Close It**
Implement two new POST routes within `routes/lifeos-council-builder-routes.js`:
- `/build/start`: To accept `task_id`, `blueprint_id`, `model_used` and call `recordBuildStart`.
- `/build/complete`: To accept `token` and `oil_receipt_ids` (or similar structure) and conditionally call `recordBuildComplete` after checking `canMarkBuildDone`.

**3. Exact Safe-Scope Files to Touch First**
- `routes/lifeos-council-builder-routes.js`
- (Implicitly) Ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are accessible and correctly implemented within the BuilderOS internal services layer.

**4. Verifier/Runtime Checks**
- **Route Registration:** Verify that `POST /build/start` and `POST /build/complete` are registered and reachable.
- **Build Start Flow:**
    - Send `POST /build/start` with `{ task_id: "...", blueprint_id: "...", model_used: "..." }`.
    - Expect HTTP 200/202.
    - Verify internal logs confirm `recordBuildStart` was invoked with the correct parameters.
- **Build Complete Flow (Success):**
    - Ensure `canMarkBuildDone()` returns true (e.g., system health GREEN).
    - Send `POST /build/complete` with `{ token: "...", oil_receipt_ids: ["...", "..."] }`.
    - Expect HTTP 200/202.
    - Verify internal logs confirm `recordBuildComplete` was invoked with the correct parameters.
- **Build Complete Flow (Health RED):**
    - Configure system state such that `canMarkBuildDone()` returns false (e.g., system health RED).
    - Send `POST /build/complete` with valid payload.
    - Expect HTTP 409 Conflict.
    - Verify `recordBuildComplete` was *not* invoked.

**5. Stop Conditions if Runtime Truth Disagrees**
- If any of the specified routes return 404 Not Found.
- If `recordBuildStart` or `recordBuildComplete` are not invoked or invoked with incorrect parameters during successful flows.
- If `POST /build/complete` returns anything other than 409 when `canMarkBuildDone()` is false.
- If `POST /build/complete` returns 409 when `canMarkBuildDone()` is true.
- If the system health state (as determined by `canMarkBuildDone`) does not correctly influence the `/build/complete` endpoint's response.