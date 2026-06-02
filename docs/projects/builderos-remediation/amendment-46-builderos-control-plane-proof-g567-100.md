Amendment 46: BuilderOS Control Plane Proof - G567-100 Remediation Note

Source Blueprint: `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md`

This document outlines the necessary implementation steps to close the proof gap identified in Amendment 46, specifically regarding the BuilderOS control plane's build lifecycle management. The previous attempt failed due to the verifier attempting to execute this documentation file as code. This remediation focuses on providing the blueprint for the required code changes.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of robust build lifecycle management within the BuilderOS control plane, specifically the API endpoints and associated service logic to record build start and completion events, and to enforce build completion conditions.

The missing implementation involves:
*   **Route Definition:** Wiring new `POST` routes in `routes/lifeos-council-builder-routes.js` for `/build/start` and `/build/complete`.
*   **Build Start Logic:** An internal `recordBuildStart` function (e.g., in `services/builder-service.js`) to persist `task_id`, `blueprint_id`, and `model_used`.
*   **Build Complete Logic:** An internal `recordBuildComplete` function (e.g., in `services/builder-service.js`) to process a build completion token and OIL receipt IDs.
*   **Conditional Completion:** Integration of a `canMarkBuildDone` check (e.g., in `services/builder-service.js` or `utils/health-check.js`) that, when failing (e.g., system health is RED), prevents build completion and returns a `409 Conflict` status.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
1.  Defining the new `POST /build/start` and `POST /build/complete` routes in `routes/lifeos-council-builder-routes.js`.
2.  Implementing placeholder or initial versions of `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions in `services/builder-service.js`.
3.  Integrating these service functions into the route handlers.
4.  Adding basic input validation for route payloads.

This slice focuses solely on the API surface and its immediate service layer interactions, avoiding deeper database schema changes or complex business logic in this initial pass.

### 3. Exact Safe-Scope Files to Touch First

*   `routes/lifeos-council-builder-routes.js`: Add new route definitions and their handlers.
*   `services/builder-service.js`: Implement `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions.
*   `utils/