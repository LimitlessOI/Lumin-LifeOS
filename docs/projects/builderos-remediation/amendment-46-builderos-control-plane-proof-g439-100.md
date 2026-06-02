# Amendment 46 BuilderOS Control Plane Proof - G439-100 Remediation Note

**Source Blueprint:** `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

This document outlines the remediation plan to address the identified implementation gap in the BuilderOS control plane, specifically regarding the wiring of build lifecycle events within `routes/lifeos-council-builder-routes.js`. The previous verifier rejection was an environmental issue related to `.md` file execution, not the content itself. This note focuses on the functional implementation required.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` module currently lacks the necessary integration points to:
-   Record the start of a build process via an internal `recordBuildStart` function.
-   Record the completion of a build process via an internal `recordBuildComplete` function.
-   Enforce build completion restrictions based on system health via an internal `canMarkBuildDone` function, returning a 409 conflict status when health is RED.

These internal control plane functions are critical for BuilderOS-only governed loop execution and operational visibility.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the existing `/build` route handlers within `routes/lifeos-council-builder-routes.js` to incorporate calls to the specified internal functions at the appropriate lifecycle stages. This ensures minimal disruption and targeted implementation.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js` (Primary modification target)
-   `services/builder-control-plane.js` (Assumed location for `recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone` if not already defined; creation or modification as needed to expose these functions).

## 4. Verifier/Runtime Checks

The following checks will validate the successful implementation:

### Unit/Integration Tests:
-   **`recordBuildStart` Call:** Verify that a `POST` request to `/build` (representing build start) successfully invokes `recordBuildStart` with `task_id`, `blueprint_id`, and `model_used` extracted from the request body.
-   **`recordBuildComplete` Call:** Verify that a `POST` request to `/build` (representing build complete) successfully invokes `recordBuildComplete` with the provided `token` and `OIL receipt IDs`.
-   **`canMarkBuildDone` 409 Response:** Simulate a scenario where `canMarkBuildDone` returns `false` (e.g., system health is RED), and assert that a `POST` request to `/build` (complete) results in a `409 Conflict` HTTP status code.
-   **No User Feature Impact:** Ensure no regressions or unintended side effects on LifeOS user features or TSOS customer-facing surfaces.

### Runtime Monitoring:
-   Monitor logs for successful invocation of `recordBuildStart` and `recordBuildComplete` during actual build cycles.
-   Observe system behavior for correct 409 responses when build completion is attempted under RED health conditions.

## 5. Stop Conditions if Runtime Truth Disagrees

The implementation should be halted and re-evaluated under the following conditions:

-   **Missing Function Calls:** If `recordBuildStart` or `recordBuildComplete` are not consistently invoked or are invoked with incorrect parameters during build lifecycle events.
-   **Incorrect HTTP Status:** If the `/build` complete endpoint does not return a `409 Conflict` when `canMarkBuildDone` indicates a build cannot be marked done (e.g., health RED).
-   **Operational Impact:** Any observed degradation, errors, or unexpected behavior in BuilderOS operations, LifeOS user features, or TSOS customer-facing surfaces directly attributable to these changes.
-   **Data Inconsistency:** If build state tracking (start/complete) becomes inconsistent or unreliable.
-   **Performance Degradation:** Significant increase in latency or resource consumption for the `/build` endpoints.

This plan ensures a targeted, verifiable, and safe approach to closing the identified implementation gap, preparing for the next C2 build pass.