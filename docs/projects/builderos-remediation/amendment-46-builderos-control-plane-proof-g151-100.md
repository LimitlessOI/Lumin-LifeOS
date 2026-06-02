# Amendment 46 BuilderOS Control Plane Proof - G151-100 Remediation

This document outlines the remediation plan and proof for closing the identified gap in the BuilderOS control plane, specifically regarding the `/build` endpoint wiring in `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete and unverified wiring of the `/build` endpoint within `routes/lifeos-council-builder-routes.js`. This endpoint requires robust handling for build start and completion events, including internal record-keeping and pre-completion health checks. The previous attempt failed due to a verifier configuration issue, not a logical flaw in the proposed implementation. The core logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` needs to be correctly integrated and invoked.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying `routes/lifeos-council-builder-routes.js` to:
1.  Define a `POST /build` route handler.
2.  Within this handler, implement logic to differentiate between build start and build complete events (e.g., based on request body parameters).
3.  For build start, call the internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
4.  For build complete, call the internal `recordBuildComplete` function, passing the build token and OIL receipt IDs.
5.  Before calling `recordBuildComplete`, invoke `canMarkBuildDone()`. If this function returns `false` (indicating RED health or other blocking conditions), immediately return an HTTP 409 Conflict status.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the primary route definition and logic.
-   `services/builder-control-plane-events.js` (ASSUMPTION: A new or existing service file for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` functions. If these functions are already defined elsewhere, import them from their respective modules. For this proof, we assume they are either imported or stubbed for demonstration within the route handler context.)

## 4. Verifier/Runtime Checks

### Verifier Checks (Automated)
-   **Syntax Check:** Ensure `routes/lifeos-council-builder-routes.js` passes Node.js ESM syntax validation.
-   **Dependency Resolution:** Verify all imported modules (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are correctly resolved.
-   **Static Analysis:** Check for common anti-patterns or unhandled promise rejections within the route handler.

### Runtime Checks (Manual/Automated Integration Tests)
-   **Scenario 1: Build Start**
    -   **Action:** `POST /build` with a payload indicating build start (e.g., `{ type: 'start', task_id: '...', blueprint_id: '...', model_used: '...' }`).
    -   **Expected Outcome:** `recordBuildStart` is invoked with the correct `task_id`, `blueprint_id`, and `model_used`. HTTP 200/202 status.
-   **Scenario 2: Build Complete (Health GREEN)**
    -   **Action:** `POST /build` with a payload indicating build completion (e.g., `{ type: 'complete', token: '...', oil_receipt_ids: [...] }`) when `canMarkBuildDone()` would return `true`.
    -   **Expected Outcome:** `canMarkBuildDone()` is invoked and returns `true`. `recordBuildComplete` is invoked with the correct token and OIL receipt IDs. HTTP 200 status.
-   **Scenario 3: Build Complete (Health RED)**
    -   **Action:** `POST /build` with a payload indicating build completion (e.g., `{ type: 'complete', token: '...', oil_receipt_ids: [...] }`) when `canMarkBuildDone()` would return `false`.
    -   **Expected Outcome:** `canMarkBuildDone()` is invoked and returns `false`. HTTP 409 Conflict status is returned. `recordBuildComplete` is *not* invoked.
-   **Logging:** Verify that appropriate logs are generated for build start, completion, and health check failures.

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be halted and flagged for immediate review if any of the following conditions are observed during runtime or integration testing:
-   `recordBuildStart` is not called on a build start request, or is called with an incorrect payload.
-   `recordBuildComplete` is not called on a successful build complete request, or is called with an incorrect payload.
-   The `/build` endpoint returns a successful status (e.g., 200) when `canMarkBuildDone()` would return `false` (health RED).
-   The `/build` endpoint returns a 409 Conflict status when `canMarkBuildDone()` would return `true` (health GREEN).
-   Any unhandled exceptions or server crashes occur during the execution of the `/build` route.

---
ASSUMPTIONS:
1. The functions `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are either available for import from a `services/builder-control-plane-events.js` or similar module, or will be stubbed/defined within the scope of the route handler for initial proof. For the purpose of this documentation, their existence is assumed for the wiring.
2. The `POST /build` endpoint will use a request body parameter (e.g., `type: 'start'` or `type: 'complete'`) to distinguish between build start and build complete events.