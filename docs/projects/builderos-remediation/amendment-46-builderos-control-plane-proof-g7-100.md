<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G7-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G7-100 Remediation

## Proof-Closing Blueprint Note

This document outlines the remediation for the OIL verifier rejection related to Amendment 46, specifically addressing the wiring of `routes/lifeos-council-builder-routes.js`. The previous attempt incorrectly placed JavaScript code directly into this markdown file, leading to a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]`. This note details the required implementation steps for the next C2 build pass, focusing on the BuilderOS control plane within approved safe scope.

### 1. Exact Missing Implementation or Proof Gap

The core gap is the absence of the specified API endpoints and their corresponding internal service calls within `routes/lifeos-council-builder-routes.js`. Specifically, the following are missing:
-   A `POST /build/start` endpoint that accepts `task_id`, `blueprint_id`, and `model_used` in its body and internally calls `recordBuildStart`.
-   A `POST /build/complete` endpoint that accepts a `token` and `OIL receipt IDs` in its body and internally calls `recordBuildComplete`.
-   Integration of a health check mechanism (`canMarkBuildDone`) within the `/build/complete` endpoint to return a `409 Conflict` response if the system health is `RED` (i.e., `canMarkBuildDone` returns `false`).

### 2. Smallest Safe Build Slice to Close It

Implement the two new `POST` routes (`/build/start` and `/build/complete`) in `routes/lifeos-council-builder-routes.js`. This includes defining the route handlers, parsing request bodies for required parameters, and invoking the corresponding internal service functions (`recordBuildStart`, `recordBuildComplete`, `canMarkBuildDone`). This slice focuses solely on the BuilderOS control plane and does not impact LifeOS user features or TSOS customer-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

-   `routes/lifeos-council-builder-routes.js`: Add the new `POST` routes and their respective handler logic.
-   `services/builder-control-plane-service.js`: Implement or extend this service to provide `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. (Inferred from previous file content's comment about "dedicated service layer" for internal stubs).
-   `models/build-record.js`: (Optional, but likely required for persistence) Ensure a model exists or is extended to handle the data persistence for build start and completion records.

### 4. Verifier/Runtime Checks

**Verifier Checks:**
-   **Syntax Check:** Ensure `routes/lifeos-council-builder-routes.js` adheres to valid Node.js ESM syntax.
-   **Route Definition Check:** Verify that `POST /build/start` and `POST /build/complete` are correctly defined and accessible via the router.
-   **Dependency Resolution:** Confirm that `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` are correctly imported and callable within the route handlers.

**Runtime Checks:**
-   **`/build/start` Endpoint Test:**
    -   Send `POST /build/start` with a valid JSON body: `{ "task_id": "test-task-123", "blueprint_id": "bp-456", "model_used": "g7-100" }`.
    -   Expect `200 OK` and verification that a build start record is created in the underlying data store.
-   **`/build/complete` Endpoint Test (Green Health):**
    -   Mock or ensure `canMarkBuildDone` returns `true`.
    -   Send `POST /build/complete` with a valid JSON body: `{ "token": "build-token-xyz", "oil_receipt_ids": ["receipt-1", "receipt-2"] }`.
    -   Expect `200 OK` and verification that the build completion record is updated in the data store.
-   **`/build/complete` Endpoint Test (Red Health):**
    -   Mock or ensure `canMarkBuildDone` returns `false` (simulating a `RED` health state).
    -   Send `POST /build/complete` with a valid JSON body: `{ "token": "build-token-xyz", "oil_receipt_ids": ["receipt-1", "receipt-2"] }`.
    -   Expect `409 Conflict`.
-   **Data Persistence:** Verify that build start and complete records are correctly persisted and retrievable from the database after successful API calls.

### 5. Stop Conditions if Runtime Truth Disagrees

-   **Route Not Found (404):** If `POST /build/start` or `POST /build/complete` return a `404 Not Found` error, indicating incorrect route definition or mounting.
-   **Internal Server Error (500):** If `recordBuildStart`, `recordBuildComplete`, or `canMarkBuildDone` throw unhandled exceptions, indicating issues in the service layer or database interaction.
-   **Incorrect Status Code:** If `/build/complete` returns `200 OK` when `canMarkBuildDone` is `false`, or fails to return `200 OK` when `canMarkBuildDone` is `true`.
-   **Data Inconsistency:** If build records are not correctly created, updated, or contain incorrect data after successful API calls, indicating a data layer issue.
-   **Dependency Errors:** If imports for internal services or utilities fail at runtime, indicating module resolution problems.