# Amendment 46 BuilderOS Control Plane Proof - G798-100 Remediation

## Blueprint Note for C2 Build Pass

This document addresses the OIL verifier rejection and outlines the necessary implementation to close the proof gap for Amendment 46, specifically regarding the BuilderOS control plane wiring in `routes/lifeos-council-builder-routes.js`.

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of robust handling for `/build` lifecycle events within `routes/lifeos-council-builder-routes.js`. This includes:
-   **Build Start:** A `POST` endpoint for `/build` to initiate a build, calling an internal `recordBuildStart` function with `task_id`, `blueprint_id`, and `model_used`.
-   **Build Complete:** A `POST` endpoint for `/build` to finalize a build, calling an internal `recordBuildComplete` function with a build `token` and `OIL receipt IDs`.
-   **Health-based Completion Guard:** A mechanism to return a `409 Conflict` status if `canMarkBuildDone` fails (indicating a RED health state) when attempting to mark a build as complete.

These functionalities are critical for the BuilderOS governed loop execution and were not fully implemented or correctly wired in the previous attempt, leading to the verifier rejection.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  **Route Definition:** Adding or modifying the `POST /build` route handler in `routes/lifeos-council-builder-routes.js`.
2.  **Internal Service Calls:** Integrating calls to `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` within this route handler.
3.  **Parameter Extraction:** Safely extracting `task_id`, `blueprint_id`, `model_used`, `token`, and `OIL receipt IDs` from the request body.
4.  **Conditional Response:** Implementing the `409 Conflict` response based on the `canMarkBuildDone` check.

This slice focuses exclusively on the BuilderOS control plane and avoids any modifications to LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This is the primary file for route definition and logic.
-   `services/builder-control-plane-service.js` (or equivalent): This file is assumed to contain the implementations for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. Imports from this service will be required in the route file.

### 4. Verifier/Runtime Checks

#### Verifier Checks:
-   **Route Existence:** Verify `POST /build` exists in `routes/lifeos-council-builder-routes.js`.
-   **`recordBuildStart` Call:** Confirm `recordBuildStart({ task_id, blueprint_id, model_used })` is called on build start requests.
-   **`recordBuildComplete` Call:** Confirm `recordBuildComplete({ token, oilReceiptIds })` is called on build complete requests.
-   **`canMarkBuildDone` Check:** Verify `canMarkBuildDone()` is called before `recordBuildComplete` for build completion.
-   **409 Response Logic:** Confirm a `409 Conflict` is returned if `canMarkBuildDone` indicates failure.
-   **Scope Adherence:** Ensure no changes outside the BuilderOS control plane, specifically no impact on LifeOS user features or TSOS customer-facing surfaces.

#### Runtime Checks:
-   **Successful Build Start:** Send `POST /build` with `{"action": "start", "task_id": "...", "blueprint_id": "...", "model_used": "..."}`. Expect `200 OK` and internal logging of `recordBuildStart`.
-   **Successful Build Complete:** Send `POST /build` with `{"action": "complete", "token": "...", "oil_