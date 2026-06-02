# Amendment 46: BuilderOS Control Plane Proof - G319-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, specifically addressing the integration of build lifecycle tracking and health-based completion checks as per Amendment 46.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of explicit wiring within `routes/lifeos-council-builder-routes.js` to:
-   Initiate a build record via `recordBuildStart` upon receiving a `POST /build` request.
-   Finalize a build record via `recordBuildComplete` after the build process concludes.
-   Enforce a health-based gate using `canMarkBuildDone` before allowing a build to be marked complete, specifically returning a 409 conflict if the system health is RED and `canMarkBuildDone` indicates failure.

This gap prevents accurate tracking of build lifecycles and robust control over build completion based on system health.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the existing `POST /build` route handler in `routes/lifeos-council-builder-routes.js`. This modification will introduce calls to the specified internal functions at the appropriate points in the request lifecycle.

**Assumptions:**
-   `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are available as imported functions from a BuilderOS service or utility module (e.g., `../services/builderService.js` or similar).
-   The `POST /build` endpoint currently orchestrates the build process and has access to `task_id`, `blueprint_id`, `model_used`, `token`, and `OIL receipt IDs`.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file requires direct modification to implement the route logic.
-   `services/builderService.js` (or equivalent): This file is assumed to contain the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. While not directly modified in this slice, its existence and API are critical.

## 4. Verifier/Runtime Checks

### Unit Tests
-   **`routes/lifeos-council-builder-routes.js`:**
    -   Verify that a `POST /build` request successfully calls `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used`.
    -   Verify that a successful build completion path calls `recordBuildComplete` with the correct `token` and `OIL receipt IDs`.
    -   Mock `canMarkBuildDone` to return `false` when health is RED; verify `POST /build` (completion path) returns a 409 status.
    -   Mock `canMarkBuildDone` to return `true` when health is GREEN; verify `POST /build` (completion path) proceeds successfully (e.g., 200 status).

### Integration Tests (Staging Environment)
-   Initiate a build via `POST /build` and confirm the `recordBuildStart` event is logged and persisted correctly in the BuilderOS database.
-   Allow a build to complete and confirm the `recordBuildComplete` event is logged and persisted correctly, including associated `token` and `OIL receipt IDs`.
-   Manually set BuilderOS health to RED (or simulate failure conditions that trigger `canMarkBuildDone` to fail). Attempt to complete a build via the API and verify a 409 HTTP status code is returned.
-   Restore BuilderOS health to GREEN. Attempt to complete a build and verify a successful HTTP status code (e.g., 200, 202).

### Static Analysis
-   Ensure the modified code adheres to existing ESLint rules and project coding standards.

## 5. Stop Conditions if Runtime Truth Disagrees

The remediation effort should be halted and re-evaluated if any of the following conditions are met during testing or verification:
-   `recordBuildStart` or `recordBuildComplete` events are not consistently observed or are recorded with incorrect data after successful build attempts.
-   The `POST /build` endpoint fails to return a 409 status when `canMarkBuildDone` indicates a build cannot be marked done due to RED health.
-   The `POST /build` endpoint fails to successfully complete a build when `canMarkBuildDone` indicates it is permissible (GREEN health).
-   Any existing BuilderOS or LifeOS Council functionality unrelated to this amendment exhibits regression or unexpected behavior.
-   The verifier rejects the `.md` file for reasons related to its content or structure, indicating a misunderstanding of the blueprint note requirements.