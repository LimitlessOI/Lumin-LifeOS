# Amendment 46: BuilderOS Control Plane Proof (G315-100) - Build Route Wiring

This document outlines the proof-closing blueprint note for wiring the `/build` routes within `routes/lifeos-council-builder-routes.js` as per Amendment 46. This implementation focuses on establishing the necessary control plane endpoints for BuilderOS-governed loop execution, without impacting LifeOS user features or TSOS customer-facing surfaces.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of dedicated `POST` endpoints within `routes/lifeos-council-builder-routes.js` to signal the start and completion of a build process. Specifically:
*   A `POST /build/start` endpoint to record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`.
*   A `POST /build/complete` endpoint to record the successful or failed completion of a build, requiring a build `token` and `OIL receipt IDs`.
*   Integration of a health check (`canMarkBuildDone`) before marking a build complete, returning a `409 Conflict` status if the system health is `RED`.

These endpoints are crucial for BuilderOS to maintain an accurate state of ongoing and completed builds, enabling robust orchestration and remediation.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `router.post` definitions to `routes/lifeos-council-builder-routes.js`.
2.  Implementing or importing the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions from a dedicated builder service module (e.g., `builderService.js`).
3.  Ensuring proper request body parsing and validation for incoming build data.
4.  Handling asynchronous operations and potential errors within the route handlers.

This slice is self-contained within the BuilderOS control plane and does not require modifications to existing LifeOS or TSOS logic.

## 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new `POST` route definitions.
*   `services/builderService.js` (or similar existing builder-specific service file): This file will contain the implementation for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If `services/builderService.js` does not exist, it should be created.
*   `utils/validation.js` (optional, if specific validation logic is needed beyond basic schema checks): For request body validation.

## 4. Verifier/Runtime Checks

To verify the implementation:
*   **Unit Tests:**
    *   Test `recordBuildStart` with valid and invalid inputs.
    *   Test `recordBuildComplete` with valid and invalid inputs, including scenarios where `canMarkBuildDone` returns `true` and `false`.
    *   Test `canMarkBuildDone` under simulated `GREEN` and `RED` health conditions.
*   **Integration Tests (API Endpoints):**
    *   Send a `POST` request to `/build/start` with valid `task_id`, `blueprint_id`, `model_used`. Expect `200 OK` and verification that the build start was recorded (e.g., via database query or mock verification).
    *   Send a `POST` request to `/build/complete` with valid `token` and `OIL receipt IDs` when `canMarkBuildDone` is `GREEN`. Expect `200 OK` and verification of build completion.
    *   Send a `POST` request to `/build/complete` with valid `token` and `OIL receipt IDs` when `canMarkBuildDone` is `RED`. Expect `409 Conflict` and verification that build completion was *not* recorded.
    *   Test edge cases: missing required parameters, invalid data types.
*   **Observability:** Monitor logs for successful build start