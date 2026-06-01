Amendment 46: BuilderOS Control Plane Proof - G9-100
Proof-Closing Blueprint Note
This note addresses the implementation gap for wiring the BuilderOS control plane build lifecycle endpoints within `routes/lifeos-council-builder-routes.js`.
1.  Exact Missing Implementation or Proof Gap
    The core gap is the absence of the following apiEPs and their associated handler logic within `routes/lifeos-council-builder-routes.js`:
-   `POST /build/start`: An endpoint to initiate a build process. This endpoint must accept `task_id`, `blueprint_id`, and `model_used` in its request body and call an internal `recordBuildStart` function with these parameters.
-   `POST /build/complete`: An endpoint to finalize a build process. This endpoint must accept a `token` and `OIL receipt IDs` in its request body and call an internal `recordBuildComplete` function.
-   Conditional Failure Logic: Before calling `recordBuildComplete`, the `/build/complete` handler must invoke a `canMarkBuildDone` function. If `canMarkBuildDone` returns `false` when the system health is `RED`, the endpoint must return an HTTP 409 Conflict status.
2.  Smallest Safe Build Slice to Close It
    The smallest safe build slice involves:
-   Adding two new `POST` routes to `routes/lifeos-council-builder-routes.js`: `/build/start` and `/build/complete`.
-   Implementing the request body parsing and validation for `task_id`, `blueprint_id`, `model_used` for `/build/start`, and `token`, `OIL receipt IDs` for `/build/complete`.
-   Importing and calling the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions from an existing BuilderOS service layer (e.g., `builderService`).
-   Implementing the conditional 409 response logic for `/build/complete` based on the `canMarkBuildDone` result and system health status.
3.  Exact Safe-Scope Files to Touch First
-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new routes and their handlers.
-   `services/builderService.js` (or equivalent): This file is assumed to contain (or will be extended to contain) the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
4.  Verifier/Runtime Checks
-   Unit Tests: Create unit tests for the new route handlers in `routes/lifeos-council-builder-routes.js` to verify:
-   Correct parsing of request bodies.
-   Successful invocation of `recordBuildStart` and `recordBuildComplete` with correct parameters.
-   Correct 409 response when `canMarkBuildDone` fails and health is RED for `/build/complete`.
-   Correct success response (e.g., 200/204) in other scenarios.
-   Integration Tests: Deploy and execute end-to-end tests:
-   Send `POST /build/start` requests and verify build initiation records.
-   Send `POST /build/complete` requests and verify build completion records.
-   Simulate a RED health state and a `canMarkBuildDone` failure to confirm the 409 response.
-   OIL Verifier Re-run: Ensure the verifier passes without syntax errors and correctly identifies the implementation as complete.
5.  Stop Conditions if Runtime Truth Disagrees
-   If `POST /build/start` or `POST /build/complete` endpoints consistently return unexpected HTTP status codes (e.g., 500 Internal Server Error) under valid input.
-   If the underlying build state (e.g., db records) does not reflect the `start` or `complete` actions after successful API calls.
-   If the `/build/complete` endpoint fails to return 409 when `canMarkBuildDone` indicates failure and health is RED, or incorrectly returns 409 when it should succeed.
-   If the OIL verifier reports new or persistent syntax errors related to the modified files, or indicates that the specified functionality is still missing.