<!-- SYNOPSIS: Amendment 46: BuilderOS Control Plane Proof - G999-100 Remediation -->

# Amendment 46: BuilderOS Control Plane Proof - G999-100 Remediation

This document outlines the remediation plan and proof-closing blueprint note for the BuilderOS control plane, specifically addressing the integration of build lifecycle tracking endpoints. This is a direct response to the OIL verifier rejection and aims to close the identified implementation gap.

## 1. The exact missing implementation or proof gap

The primary gap is the absence of a robust, auditable mechanism within the BuilderOS control plane to track the start and completion of individual builds. This includes:
-   Missing HTTP POST endpoints in `routes/lifeos-council-builder-routes.js` for `/build/start` and `/build/complete`.
-   Lack of internal service functions (`recordBuildStart`, `recordBuildComplete`) to persist or log these build lifecycle events.
-   Absence of a health-check mechanism (`canMarkBuildDone`) to prevent build completion under critical system health conditions, specifically returning a `409 Conflict` when health is RED.
-   The current system lacks the necessary wiring to connect the external build orchestration signals to the internal BuilderOS state machine, leading to untracked or unverified build states.

## 2. The smallest safe build slice to close it

This build slice focuses on establishing the foundational API surface and a minimal, isolated service layer for build lifecycle tracking within the BuilderOS control plane. This ensures auditable build state transitions and enforces critical health-based completion gates without impacting existing LifeOS user features or TSOS customer-facing surfaces.

**Implementation Steps:**

1.  **Create `services/builder-control-plane-service.js`:**
    -   Export an asynchronous function `recordBuildStart({ task_id, blueprint_id, model_used })`. This function will log the start event and, in future passes, interact with a persistence layer.
    -   Export an asynchronous function `recordBuildComplete({ token, oil_receipt_ids })`. This function will log the completion event and, in future passes, interact with a persistence layer.
    -   Export an asynchronous function `canMarkBuildDone()`. This function will initially return `true` but will be extended to query system health. For testing the `409 Conflict` scenario, it can be temporarily configured to return `false`.

2.  **Modify `routes/lifeos-council-builder-routes.js`:**
    -   Import the new service functions from `services/builder-control-plane-service.js`.
    -   Add a `POST` endpoint for `/build/start`:
        -   Expects `task_id`, `blueprint_id`, `model_used` in the request body.
        -   Perform basic validation (e.g., presence and type checks). Return `400 Bad Request` for invalid input.
        -   Call `recordBuildStart` with the validated payload.
        -   Respond with `200 OK` or `201 Created` on success.
    -   Add a `POST` endpoint for `/build/complete`:
        -   Expects `token` and `oil_receipt_ids` in the request body.
        -   Perform basic validation. Return `400 Bad Request` for invalid input.
        -   Call `canMarkBuildDone()`.
        -   If `canMarkBuildDone()` returns `false` (indicating health RED), respond with `409 Conflict`.
        -   Otherwise, call `recordBuildComplete` with the validated payload.
        -   Respond with `200 OK` on success.

This slice is designed to be self-contained, testable, and provides the necessary hooks for future persistence and advanced health-check integrations.

## 3. Exact safe-scope files to touch first

-   `routes/lifeos-council-builder-routes.js`: This file will be modified to add the new POST endpoints.
-   `services/builder-control-plane-service.js`: A new file will be created to encapsulate the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` functions. This adheres to separation of concerns and keeps the route handler lean.
-   (Optional, for robust validation in future passes) `utils/validation.js`: If a shared validation utility exists, it could be extended. For this proof, inline validation within the route