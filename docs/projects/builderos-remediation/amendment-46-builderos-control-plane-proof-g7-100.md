Amendment 46: BuilderOS Control Plane Proof - G7-100 Remediation
Proof-Closing Blueprint Note
This document outlines the remediation plan and proof for the BuilderOS control plane changes, addressing the OIL verifier rejection related to the `ERR_UNKNOWN_FILE_EXTENSION` error. The previous attempt incorrectly submitted JS code as a markdown file. This blueprint note describes the required implementation for `routes/lifeos-council-builder-routes.js`.
1. Exact Missing Implementation or Proof Gap
The core gap is the complete wiring of the `/build` endpoints within `routes/lifeos-council-builder-routes.js` to integrate with internal BuilderOS service functions for build lifecycle management. Specifically:
-   A `POST /build/start` endpoint that accepts `task_id`, `blueprint_id`, and `model_used` in the request body. This endpoint must call an internal `recordBuildStart` function with these parameters.
-   A `POST /build/complete` endpoint that accepts a `token` and `OIL receipt IDs` in the request body.
-   Prior to calling `recordBuildComplete`, this endpoint must invoke an internal `canMarkBuildDone` function.
-   If `canMarkBuildDone` returns a failure state (e.g., `false` or throws an error) and the system health is determined to be RED, the endpoint must return an HTTP 409 Conflict status.
-   If `canMarkBuildDone` passes or health is not RED, the endpoint proceeds to call `recordBuildComplete` with the provided `token` and `OIL receipt IDs`.
2. Smallest Safe Build Slice to Close It
The smallest safe build slice involves:
-   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
-   Implementing request handlers for these routes that parse the incoming JSON body.
-   Importing and calling the internal BuilderOS service functions: `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`.
-   Implementing the conditional 409 response logic based on `canMarkBuildDone` and system health status.
-   Ensuring proper errHdl and response formatting for success and failure cases.
3. Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js` (primary file for route definition and handler logic).
-   (Potential) `services/build-lifecycle-service.js` (or similar existing internal service file) to ensure `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are exposed and correctly implemented, if not already.
4. Verifier/Runtime Checks
-   Endpoint Reachability: Send `POST` requests to `/build/start` and `/build/complete` and verify HTTP 200/204 responses for valid inputs.
-   `recordBuildStart` Invocation: Monitor internal logs or system state to confirm `recordBuildStart` is called with the correct `task_id`, `blueprint_id`, and `model_used` after a successful `/build/start` request.
-   `recordBuildComplete` Invocation: Monitor internal logs or system state to confirm `recordBuildComplete` is called with the correct `token` and `OIL receipt IDs` after a successful `/build/complete` request (when `canMarkBuildDone` passes).
-   409 Conflict Logic: Simulate a scenario where `canMarkBuildDone` fails and system health is RED. Verify that `POST /build/complete` returns an HTTP 409 status code.
-   Data Persistence: Verify that build start/completion events are correctly recorded in the BuilderOS internal data store.
5. Stop Conditions if Runtime Truth Disagrees
-   Route Not Found (404): If `/build/start` or `/build/complete` endpoints are not reachable.
-   Incorrect Status Codes: If successful operations return non-2xx codes, or if the 409 condition does not trigger when expected.
-   Internal Function Call Failure: If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` are not invoked, or if their invocation results in unexpected internal errors (e.g., 500).
-   Data Inconsistency: If build lifecycle events are not accurately reflected in BuilderOS internal state after successful API calls.
-   Security/Authorization Issues: If unauthorized access is granted or legitimate requests are denied due to incorrect authz checks.