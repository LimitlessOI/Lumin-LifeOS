# Amendment 46 BuilderOS Control Plane Proof - G1021-100

## Introduction

This document serves as a proof-closing blueprint note for `AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`, specifically addressing the signal to wire `routes/lifeos-council-builder-routes.js` for build start and completion events, including health checks. This note outlines the necessary implementation steps, verification methods, and stop conditions for the next C2 build pass.

## 1. Exact Missing Implementation or Proof Gap

The `routes/lifeos-council-builder-routes.js` currently lacks the necessary API endpoints and associated controller logic to manage the lifecycle of a BuilderOS build. Specifically, the following functionalities are missing:
-   A `POST` endpoint to record the initiation of a build, requiring `task_id`, `blueprint_id`, and `model_used`.
-   A `POST` endpoint to record the completion of a build, requiring a `token` and `OIL receipt IDs`.
-   An integrated health check (`canMarkBuildDone`) that prevents build completion if the system health is in a RED state, returning a 409 Conflict.

The internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`) are assumed to be available from a `builder-service` module or will be implemented as part of this build slice.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adding two new `POST` routes to `routes/lifeos-council-builder-routes.js` and implementing their respective handler functions. These handlers will:
1.  Parse incoming request bodies for required parameters.
2.  Call the appropriate internal `builder-service` functions (`recordBuildStart`, `recordBuildComplete`).
3.  For build completion, execute `canMarkBuildDone` as a pre-check and respond with a 409 if it fails.
4.  Return appropriate HTTP status codes and responses.

This slice focuses on the routing and controller layer, delegating the core business logic to existing or newly created service functions.

## 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new `POST /build/start` and `POST /build/complete` routes and their corresponding handler