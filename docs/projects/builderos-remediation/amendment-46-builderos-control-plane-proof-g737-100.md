<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof (G737-100) -->

# Amendment 46 BuilderOS Control Plane Proof (G737-100)

This document outlines the remediation plan and proof for the BuilderOS control plane, addressing the requirements from `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md` and the specific wiring signals for `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the incomplete integration of build lifecycle events (`recordBuildStart`, `recordBuildComplete`) and health-based build completion checks (`canMarkBuildDone`) within the `/build` endpoint of `routes/lifeos-council-builder-routes.js`. Specifically:
-   The `/build` POST endpoint does not internally call `recordBuildStart` at the beginning of a build process, passing `task_id`, `blueprint_id`, and `model_used`.
-   The `/build` endpoint does not internally call `recordBuildComplete` upon successful build completion, passing the build token and OIL receipt IDs.
-   There is no check using `canMarkBuildDone` before marking a build as complete, and no 409 response is returned if this check fails when the system health is RED.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the existing `/build` POST handler in `routes/lifeos-council-builder-routes.js` to:
1.  Introduce a call to `recordBuildStart` at the handler's entry point.
2.  Introduce a conditional check using `canMarkBuildDone` before the final build completion logic.
3.  Implement a 409 response path if `canMarkBuildDone` returns false when health is RED.
4.  Introduce a call to `recordBuildComplete` before the final response for a successful build.

This slice focuses solely on the `/build` endpoint's internal logic flow, without altering external API contracts or other routes.

## 3. Exact Safe-Scope Files to Touch First

The only file requiring direct modification for this remediation is:
-   `routes/lifeos-council-builder-routes.js`

Auxiliary files (e.g., `src/services/build-control.js` for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` implementations) are assumed to exist and be stable. If they do not exist, their creation would be the *next* safe build slice, but the current task is to *wire* the calls.

## 4. Verifier/Runtime Checks

To verify the implementation:
-   **Unit Tests:** Add unit tests for `routes/lifeos-council-builder-routes.js` that mock `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` to assert:
    -   `recordBuildStart` is called with correct parameters on `/build` POST.
    -   `recordBuildComplete` is called with correct parameters on successful `/build` POST completion.
    -   A 409 status is returned when `canMarkBuildDone` (mocked to return `false` when health is RED) is invoked before completion.
    -   A successful 2xx status is returned when `canMarkBuildDone` (mocked to return `true`) is invoked before completion.
-   **Integration Tests:** Deploy to a staging environment and perform end-to-end tests:
    -   Initiate a build via `/build` and observe logs/metrics for `recordBuildStart` invocation.
    -   Complete a build and observe logs/metrics for `recordBuildComplete` invocation and correct OIL receipt IDs.
    -   Simulate a RED health state (if possible via a control plane) and attempt to complete a build; verify a 409 response.

## 5. Stop Conditions if Runtime Truth Disagrees

The remediation should be halted and re-evaluated if any of the following conditions are met during verifier or runtime checks:
-   The `/build` endpoint's core functionality (initiating and tracking builds) is disrupted for LifeOS Council users.
-   `recordBuildStart` or `recordBuildComplete` are not invoked or are invoked with incorrect parameters.
-   The 409 response for `canMarkBuildDone` failure in RED health state is not consistently returned.
-   Existing unit or integration tests for `routes/lifeos-council-builder-routes.js` begin to fail unexpectedly, indicating unintended side effects.
-   Performance degradation is observed on the `/build` endpoint.