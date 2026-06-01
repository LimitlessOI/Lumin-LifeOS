# Amendment 46: BuilderOS Control Plane Proof - G3-100 Remediation

This document outlines the remediation plan for the OIL verifier rejection related to Amendment 46, focusing on the BuilderOS control plane. The verifier's rejection was due to an attempt to execute this `.md` file as a JavaScript module, indicating a misconfiguration in the verification environment rather than an issue with the markdown content itself. The core task remains to implement the specified build lifecycle hooks within `routes/lifeos-council-builder-routes.js`.

## 1. Exact Missing Implementation or Proof Gap

The primary gap is the implementation of the build lifecycle event recording and health-based completion gate within `routes/lifeos-council-builder-routes.js`. Specifically:
-   A `POST` endpoint for `/build/start` to call `recordBuildStart({ task_id, blueprint_id, model_used })`.
-   A `POST` endpoint for `/build/complete` to call `recordBuildComplete` with a token and OIL receipt IDs.
-   The `/build/complete` endpoint must return a `409 Conflict` if `canMarkBuildDone()` returns `false` (indicating a RED health status).

The verifier's `ERR_UNKNOWN_FILE_EXTENSION` for this `.md` file is a false positive regarding the *content* of this file, but it correctly signals that the *proof* (the actual code implementation) is not yet integrated and verifiable.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Adding the necessary `POST` route handlers to `routes/lifeos-council-builder-routes.js`.
2.  Implementing or importing the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. Assuming these are internal BuilderOS services, they should be imported or defined within the scope of the routes or a related service layer.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will contain the new route definitions and their handlers.
-   Potentially a new or existing service file (e.g., `services/build-lifecycle-service.js` or `utils/builder-health.js`) if `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are not already defined globally or in an accessible utility. For this pass, we will assume they are either imported or stubbed for immediate integration.

## 4. Verifier/Runtime Checks

-   **Functional Test 1 (Build Start):** Send `POST /build/start` with `task_id`, `blueprint_id`, `model_used`. Expect `200 OK` and verification that `recordBuildStart` was called with correct parameters.
-   **Functional Test 2 (Build Complete - Success):** Ensure `canMarkBuildDone()` returns `true`. Send `POST /build/complete` with `token` and `oil_receipt_ids`. Expect `200 OK` and verification that `recordBuildComplete` was called with correct parameters.
-   **Functional Test 3 (Build Complete - Conflict):** Configure system such that `canMarkBuildDone()` returns `false` (e.g., simulate RED health). Send `POST /build/complete`. Expect `409 Conflict`.
-   **System Check:** Verify that this `amendment-46-builderos-control-plane-proof-g3-100.md` file is treated as a documentation asset and not subjected to JavaScript module parsing by the verifier.

## 5. Stop Conditions if Runtime Truth Disagrees

-   If `recordBuildStart` or `recordBuildComplete` functions are not found or throw unexpected errors during integration.
-   If `canMarkBuildDone` cannot be reliably controlled for testing RED/GREEN health states.
-   If the `/build/complete` endpoint does not consistently return `409` when `canMarkBuildDone` is `false`, or `200` when it's `true`.
-   If the verifier continues to attempt to execute `.md` files as JavaScript, indicating a fundamental misconfiguration in the verification environment that needs addressing outside of code changes.