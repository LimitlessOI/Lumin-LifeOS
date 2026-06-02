# Amendment 46 BuilderOS Control Plane Proof (G199-100)

**Source Blueprint:** `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

This document serves as a proof-closing note for the implementation of BuilderOS control plane wiring within `routes/lifeos-council-builder-routes.js`, addressing the previous verifier rejection and outlining the next steps for a C2 build pass.

---

## 1. Exact Missing Implementation or Proof Gap

The previous OIL verifier rejection was due to an environmental configuration issue (attempting to execute a `.md` file as JavaScript) and not a defect in the proposed code or documentation content.

The actual missing implementation is the wiring of the BuilderOS control plane routes within `routes/lifeos-council-builder-routes.js` as specified in the source blueprint and the task instructions. Specifically:

*   **`/build/start` (POST):** Needs to be wired to call the internal `recordBuildStart({ task_id, blueprint_id, model_used })` function.
*   **`/build/complete` (POST):** Needs to be wired to call the internal `recordBuildComplete` function with `token` and `OIL receipt IDs`. This endpoint must also check `canMarkBuildDone` and return a `409 Conflict` if `canMarkBuildDone` fails when the system health is RED.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves implementing the two new POST endpoints: `/build/start` and `/build/complete` within `routes/lifeos-council-builder-routes.js`, ensuring they correctly invoke their respective internal BuilderOS control plane functions and handle the specified error condition.

## 3. Exact Safe-Scope Files to Touch First

`routes/lifeos-council-builder-routes.js`

## 4. Verifier/Runtime Checks

To verify the implementation:

*   **`/build/start` Endpoint:**
    *   **Action:** Send a `POST` request to `/build/start` with a JSON body containing `task_id`, `blueprint_id`, and `model_used`.
    *   **Expected Outcome:** The internal `recordBuildStart` function is invoked with the provided parameters. The endpoint returns a successful HTTP status code (e.g., `200 OK` or `202 Accepted`).
*   **`/build/complete` Endpoint (Success Path):**
    *   **Action:** Ensure system health is not RED. Send a `POST` request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids` (an array of strings).
    *   **Expected Outcome:** The internal `recordBuildComplete` function is invoked with the provided parameters. The `canMarkBuildDone` check passes. The endpoint returns a successful HTTP status code (e.g., `200 OK`).
*   **`/build/complete` Endpoint (Failure Path - Health RED):**
    *   **Action:** Configure the system health to be RED (simulated or actual). Send a `POST` request to `/build/complete` with a JSON body containing `token` and `oil_receipt_ids`.
    *   **Expected Outcome:** The `canMarkBuildDone` check fails due to RED health. The endpoint returns an HTTP `409 Conflict` status code.

## 5. Stop Conditions if Runtime Truth Disagrees

The build pass should be stopped and re-evaluated if any of the following conditions are met during runtime verification:

*   The `/build/start` endpoint fails to invoke `recordBuildStart` or passes incorrect parameters.
*   The `/build/complete` endpoint fails to invoke `recordBuildComplete` or passes incorrect parameters.
*   The `/build/complete` endpoint does not correctly check `canMarkBuildDone` or fails to return `409 Conflict` when `canMarkBuildDone` fails under RED health conditions.
*   Any of the implemented endpoints return unexpected HTTP status codes or error messages not aligned with the specification.
*   The implementation introduces regressions or side effects outside the BuilderOS control plane.