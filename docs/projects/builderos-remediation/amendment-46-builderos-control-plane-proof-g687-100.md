<!-- SYNOPSIS: Amendment 46 BuilderOS Control Plane Proof: G687-100 Remediation -->

# Amendment 46 BuilderOS Control Plane Proof: G687-100 Remediation

## 1. Missing Implementation / Proof Gap

The `routes/lifeos-council-builder-routes.js` module lacks the necessary route definitions and associated logic to manage the BuilderOS build lifecycle. Specifically, the endpoints for initiating a build (`/build/start`) and completing a build (`/build/complete`), including the conditional completion based on system health, are not wired.

## 2. Smallest Safe Build Slice

Implement the following within `routes/lifeos-council-builder-routes.js`:
- A `POST /build/start` endpoint that accepts `task_id`, `blueprint_id`, and `model_used` in its body and calls `recordBuildStart` from the BuilderOS logic layer.
- A `POST /build/complete` endpoint that accepts a `token` and `OIL receipt IDs` in its body. This endpoint must first check system health and call `canMarkBuildDone`. If `canMarkBuildDone` returns `false` when the system health is RED, it must return a `409 Conflict` status. Otherwise, it proceeds to call `recordBuildComplete` from the BuilderOS logic layer.

## 3. Exact Safe-Scope Files to Touch First

- `routes/lifeos-council-builder-routes.js`
- `services/lifeos-council-builder-logic.js` (to ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly implemented and exposed)
- `utils/system-health.js` (or equivalent, to provide `getSystemHealth` status)

## 4. Verifier / Runtime Checks

### 4.1. Build Start Endpoint Verification
- **Action:** Send `POST /build/start` to `routes/lifeos-council-builder-routes.js` with a JSON body:
  ```json
  {
    "task_id": "test-task-g687-001",
    "blueprint_id": "amendment-46-bp",
    "model_used": "g687"
  }
  ```
- **Expected Outcome:**
    - HTTP status code 200 or 202.
    - The internal `recordBuildStart` function is invoked with the provided `task_id`, `blueprint_id`, and `model_used`.
    - A new build record is successfully initiated in the BuilderOS state.

### 4.2. Build Complete Endpoint Verification (Success Path)
- **Action:** Ensure system health is GREEN. Send `POST /build/complete` to `routes/lifeos-council-builder-routes.js` with a JSON body:
  ```json
  {
    "token": "build-session-xyz-123",
    "oil_receipt_ids": ["oil-rec-a1", "oil-rec-b2"]
  }
  ```
- **Expected Outcome:**
    - HTTP status code 200 or 202.
    - The internal `canMarkBuildDone` function is invoked and returns `true`.
    - The internal `recordBuildComplete` function is invoked with the provided `token` and `oil_receipt_ids`.
    - The corresponding build record is marked as complete in the BuilderOS state.

### 4.3. Build Complete Endpoint Verification (Failure Path - Health RED)
- **Action:** Simulate system health RED state (e.g., via a health service mock or direct state manipulation). Send `POST /build/complete` to `routes/lifeos-council-builder-routes.js` with a JSON body:
  ```json
  {
    "token": "build-session-abc-456",
    "oil_receipt_ids": ["oil-rec-c3"]
  }
  ```
- **Expected Outcome:**
    - HTTP status code 409 Conflict.
    - The internal `canMarkBuildDone` function is invoked and returns `false` due to the RED health state.
    - The internal `recordBuildComplete` function is *not* invoked.
    - The build record remains in an incomplete or pending state.

## 5. Stop Conditions if Runtime Truth Disagrees

- If `POST /build/start` fails to correctly invoke `recordBuildStart` or does not result in a new build record.
- If `POST /build/complete` (success path) does not correctly invoke `recordBuildComplete` or fails to mark the build as complete.
- If `POST /build/complete` (failure path) does not return a 409 status when `canMarkBuildDone` fails due to RED health, or if `recordBuildComplete` is invoked despite the failure condition.
- If the system health status cannot be reliably retrieved or if `canMarkBuildDone` does not accurately reflect the health-based completion policy.
- If any of the required internal functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are not found or throw unexpected errors during route execution.