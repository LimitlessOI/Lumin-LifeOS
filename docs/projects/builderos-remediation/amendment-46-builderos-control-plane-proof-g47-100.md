# Amendment 46 BuilderOS Control Plane Proof - G47-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, addressing the implementation gap identified by the OIL verifier rejection (which was a verifier configuration issue, not a code syntax error in the `.md` file itself). The primary focus is to implement the required route wiring for build lifecycle management within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The core missing implementation is the integration of build lifecycle events (`recordBuildStart`, `recordBuildComplete`) and build completion authorization (`canMarkBuildDone`) into the BuilderOS control plane routes. Specifically, the `routes/lifeos-council-builder-routes.js` file lacks the necessary `POST` endpoints for `/build/start` and `/build/complete` as specified.

The OIL verifier rejection (`ERR_UNKNOWN_FILE_EXTENSION` for `.md`) indicates a misconfiguration in the verifier's environment, where it attempted to execute this documentation file as a Node.js module. This is not a code defect in the `.md` file content itself, but an external system issue. The proof gap is the absence of the specified route handlers.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding two new `POST` endpoints to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
2.  Implementing the logic within these endpoints to call the internal `recordBuildStart` and `recordBuildComplete` functions, respectively.
3.  Integrating the `canMarkBuildDone` check for the `/build/complete` endpoint, returning a 409 status if the check fails under "health RED" conditions.
4.  Ensuring proper import of the internal control plane functions.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their handlers.
-   `../services/builder-control-plane.js` (assumed path): This file (or an equivalent internal service module) is expected to export `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. If these functions do not exist, they would need to be stubbed or implemented here, adhering to existing patterns. For this build slice, we assume they are available for import.

## 4. Verifier/Runtime Checks

### Verifier Checks:
-   **Verifier Configuration:** Confirm the OIL verifier is configured to correctly parse `.md` files as documentation and not attempt to execute them as Node.js modules. This is an external system check.
-   **Syntax Check:** Ensure the modified `routes/lifeos-council-builder-routes.js` adheres to existing Node/ESM patterns and passes static analysis.

### Runtime Checks:
-   **`/build/start` Endpoint:**
    -   Send `POST` request to `/build/start` with `task_id`, `blueprint_id`, `model_used`.
    -   Verify a 200 OK response.
    -   Verify `recordBuildStart` is invoked with the correct parameters (e.g., via logging or mock verification in tests).
-   **`/build/complete` Endpoint (Success Path):**
    -   Send `POST` request to `/build/complete` with `token` and `OIL receipt IDs`.
    -   Ensure `canMarkBuildDone` returns `true` (or is not in a "health RED" state).
    -   Verify a 200 OK response.
    -   Verify `recordBuildComplete` is invoked with the correct parameters.
-   **`/build/complete` Endpoint (Failure Path - Health RED):**
    -   Configure the environment or mock `canMarkBuildDone` to return `false` when "health RED".
    -   Send `POST` request to `/build/complete`.
    -   Verify a 409 Conflict response.
    -   Verify `recordBuildComplete` is *not* invoked.
-   **Isolation:** Confirm no unintended side effects on LifeOS user features or TSOS customer-facing surfaces.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` cannot be imported or are undefined at runtime.
-   If the `/build/start` endpoint fails to record the build start event or returns an unexpected status.
-   If the `/build/complete` endpoint fails to record the build completion event or returns an unexpected status (e.g., 500 instead of 200 on success).
-   If the 409 Conflict response for `/build/complete` (when `canMarkBuildDone` fails due to "health RED") is not consistently observed or is triggered under incorrect conditions.
-   If any modifications impact LifeOS user features or TSOS customer-facing surfaces, indicating a scope breach.