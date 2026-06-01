### Proof-Closing Blueprint Note: Amendment 46 BuilderOS Control Plane - G35-100 Remediation

This note addresses the required follow-through for Amendment 46, specifically wiring the BuilderOS control plane endpoints in `routes/lifeos-council-builder-routes.js`.

#### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of the necessary route handlers and their integration with the BuilderOS internal state management functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) within `routes/lifeos-council-builder-routes.js`. Specifically:
-   A `POST /build/start` endpoint to initiate a build record.
-   A `POST /build/complete` endpoint to finalize a build record.
-   Conditional error handling (409 Conflict) for `canMarkBuildDone` failures during build completion when health is RED.

#### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
2.  Implementing the logic within these routes to call the respective internal BuilderOS functions (`recordBuildStart`, `recordBuildComplete`).
3.  Integrating the `canMarkBuildDone` check before `recordBuildComplete` and returning a 409 status if it fails when health is RED.
4.  Ensuring proper request body parsing for `task_id`, `blueprint_id`, `model_used` for `/build/start`, and `token`, `oil_receipt_ids` for `/build/complete`.

#### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handlers.
-   `services/build-tracker.js` (ASSUMPTION): This file is the assumed location for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these functions reside elsewhere, that file should be touched instead.

#### 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `POST /build/start` successfully calls `recordBuildStart` with correct parameters and returns 200/202.
    -   Verify `POST /build/complete` successfully calls `recordBuildComplete` with correct parameters and returns 200/202 when `canMarkBuildDone` passes.
    -   Verify `POST /build/complete` returns 409 when `canMarkBuildDone` fails (i.e., when health is RED).
    -   Verify input validation for all required parameters (`task_id`, `blueprint_id`, `model_used`, `token`, `oil_receipt_ids`).
-   **Integration Tests:**
    -   Simulate a full build lifecycle: call `/build/start`, then `/build/complete`. Verify state transitions in the underlying build tracking system.
    -   Test edge cases: calling `/build/complete` without a prior `/build/start` (should fail or be handled gracefully based on existing patterns).
-   **Manual Verification (Local Dev/Staging):**
    -   Use `curl` or a similar tool to hit the new endpoints and observe responses and logs.
    -   Monitor BuilderOS internal logs for `recordBuildStart` and `recordBuildComplete` invocations.

#### 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` are not found or cannot be imported from the assumed service location (`services/build-tracker.js`).
-   If the expected request body parameters are not correctly parsed or are missing, leading to handler failures.
-   If the `canMarkBuildDone` function's behavior (especially returning `false` when health is RED) cannot be reliably simulated or tested, indicating a deeper dependency issue or an incorrect assumption about its implementation.
-   If the verifier continues to attempt to execute `.md` files as JavaScript, indicating a misconfiguration in the verification environment that prevents proper evaluation of the *content* of the markdown file. This is an external system issue, not a code issue.

---
ASSUMPTIONS:
- The functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` exist and are importable from an internal service, likely `services/build-tracker.js` or a similar module.
- `routes/lifeos-council-builder-routes.js` uses an Express-like routing framework.
- The "health RED" condition for `canMarkBuildDone` is an internal state managed by the `canMarkBuildDone` function or its dependencies, not a parameter passed directly to the