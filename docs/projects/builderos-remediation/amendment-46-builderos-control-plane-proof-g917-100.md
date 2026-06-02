# Amendment 46 BuilderOS Control Plane Proof (G917-100)

This document outlines the proof-closing blueprint note for integrating BuilderOS control plane signals into the LifeOS Council builder routes, as per Amendment 46. It details the missing implementation, the smallest safe build slice, affected files, verification steps, and stop conditions.

## 1. Exact Missing Implementation / Proof Gap

The `routes/lifeos-council-builder-routes.js` file currently lacks the necessary endpoints and logic to process BuilderOS build start and complete signals. Specifically, the following are missing:

-   **`POST /build/start` endpoint:** This route needs to accept a payload containing `task_id`, `blueprint_id`, and `model_used`. Upon receipt, it must invoke an internal `recordBuildStart` function with these parameters to log or persist the build initiation event.
-   **`POST /build/complete` endpoint:** This route needs to accept a payload containing a `token` and `OIL receipt IDs`. It must invoke an internal `recordBuildComplete` function with these parameters to finalize the build record.
-   **Health Check Integration:** Before marking a build complete, a check using an internal `canMarkBuildDone` function is required. If `canMarkBuildDone` returns `false` (indicating a RED health state or other blocking condition), the endpoint must return an HTTP 409 Conflict status code.

The proof gap lies in the absence of these route definitions, their associated internal function calls, and the conditional error handling for build completion.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:

1.  **Route Definition:** Adding two new `POST` routes (`/build/start` and `/build/complete`) to `routes/lifeos-council-builder-routes.js`.
2.  **Internal Function Integration:** Importing or defining the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. These functions are expected to reside in an existing or new internal service/utility module (e.g., `services/buildControlService.js`).
3.  **Request Body Parsing:** Ensuring the routes correctly parse the incoming JSON payloads for `task_id`, `blueprint_id`, `model_used`, `token`, and `OIL receipt IDs`.
4.  **Conditional Logic:** Implementing the `if (!canMarkBuildDone()) { return res.status(409).send('Build completion blocked by system health.'); }` logic within the `/build/complete` route handler.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new route definitions and their respective handlers.
-   `services/buildControlService.js` (or similar existing internal service file): This file will be created or modified to export `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`. These functions will encapsulate the core logic for interacting with the BuilderOS control plane's internal state or persistence layer.

## 4. Verifier/Runtime Checks

-   **Unit Tests:**
    -   Verify `POST /build/start` calls `recordBuildStart` with the correct payload and returns a 2xx status.
    -   Verify `POST /build/complete` calls `recordBuildComplete` with the correct payload and returns a 2xx status when `canMarkBuildDone` is true.
    -   Verify `POST /build/complete