# Amendment 46 BuilderOS Control Plane Proof G8-100: Wire Builder Routes

This document outlines the necessary steps to implement the BuilderOS control plane wiring for build start and completion events within `routes/lifeos-council-builder-routes.js`, addressing the requirements of Amendment 46.

### 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary POST endpoints to handle `/build/start` and `/build/complete` events. Specifically, it needs to:
- Expose a `POST /build/start` endpoint that calls `recordBuildStart({ task_id, blueprint_id, model_used })`.
- Expose a `POST /build/complete` endpoint that calls `recordBuildComplete` with `token` and `oil_receipt_ids`.
- Implement a health check for `canMarkBuildDone` on `/build/complete`, returning a 409 status if the check fails (e.g., when health is RED).

### 2. Smallest Safe Build Slice to Close It

Implement the two new POST routes (`/build/start` and `/build/complete`) within `routes/lifeos-council-builder-routes.js`. These routes will integrate with the existing `builder-control-plane-service.js` functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) to manage build state transitions.

### 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`

### 4. Verifier/Runtime Checks

- **`POST /build/start`:**
    - Send a POST request to `/build/start` with a JSON body containing `task_id`, `blueprint_id`, and `model_used`.
    - Expected outcome: HTTP 200 OK response.
    - Verify that `recordBuildStart` is invoked with the correct parameters (mock/spy `recordBuildStart` in tests).
- **`POST /build/complete` (Success Path):**
    - Send a POST request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids`.
    - Expected outcome: HTTP 200 OK response.
    - Verify that `recordBuildComplete` is invoked with the correct parameters (mock/spy `recordBuildComplete` in tests).
    - Verify that `canMarkBuildDone` is called and returns true (mock `canMarkBuildDone` to return true).
- **`POST /build/complete` (Health RED Path):**
    - Send a POST request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids`.
    - Expected outcome: HTTP 409 Conflict response.
    - Verify that `canMarkBuildDone` is called and returns false (mock `canMarkBuildDone` to return false, simulating