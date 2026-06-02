# Amendment 46 BuilderOS Control Plane Proof - G768-100 Remediation

This document outlines the remediation plan for the BuilderOS control plane, addressing the OIL verifier rejection and detailing the implementation steps for the `/build` lifecycle endpoints.

## OIL Verifier Rejection Analysis

The verifier rejected the previous attempt with `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".md"`. This indicates the verifier attempted to execute the `.md` file as a Node.js module, which is an incorrect interpretation of the file's purpose. This document is a blueprint note, not executable code. The remediation focuses on the *content* of the blueprint note, which guides the *actual code implementation*.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The primary gap is the absence of the specified `/build` lifecycle endpoints within `routes/lifeos-council-builder-routes.js` and their corresponding controller logic for `recordBuildStart`, `recordBuildComplete`, and the `canMarkBuildDone` health check. The current system lacks the explicit wiring and internal service calls to manage the BuilderOS governed loop execution state.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   **Route Definition:** Adding `POST /build/start` and `POST /build/complete` to `routes/lifeos-council-builder-routes.js`.
*   **Controller Logic:** Implementing or integrating controller functions that:
    *   For `/build/start`: Validate `task_id`, `blueprint_id`, `model_used` from the request body and call an internal `builderService.recordBuildStart` function.
    *   For `/build/complete`: Validate `token` and `OIL receipt IDs` from the request body. Before recording completion, call an internal `builderService.canMarkBuildDone` function. If `canMarkBuildDone` returns a `RED` health status, respond with `409 Conflict`. Otherwise, call `builderService.recordBuildComplete`.
*   **Internal Service Layer:** Creating or extending an internal `builderService` (e.g., `services/builder-control-plane-service.js`) to encapsulate the `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone` logic, ensuring BuilderOS-only governance and no impact on LifeOS user features.

### 3. Exact Safe-Scope Files to Touch First

1.  `routes/lifeos-council-builder-routes.js`: To define the new `POST` routes.
2.  `controllers/builder-control-plane-controller.js` (or similar existing builder-specific controller): To implement the handler functions for the new routes. This file will import and utilize the `builderService`.
3.  `services/builder-control-plane-service.js` (new file, or extend an existing builder service): To implement the core logic for `recordBuildStart`, `recordBuildComplete`, and `canMarkBuildDone`, interacting with internal data stores as needed.

### 4. Verifier/Runtime Checks

*   **Route Accessibility:** Verify that `POST /build/start` and `POST /build/complete` are accessible only internally (e.g., via appropriate authentication/authorization checks, not exposed to public APIs).
*   **Build Start Recording:**
    *   **Input:** `POST /build/start` with `{ "task_id": "t123", "blueprint_id": "b456", "model_used": "g768" }`.
    *   **Expected Output:** `200 OK` or `201 Created`, and verification that the build start event is recorded in the internal BuilderOS state.
*   **Build Complete Recording (Green Health):**
    *   **Precondition:** `builderService.canMarkBuildDone()` returns `GREEN`.
    *   **Input:** `POST /build/complete` with `{ "token": "xyz", "oil_receipt_ids": ["r1", "r2"] }`.
    *   **Expected Output:** `200 OK`, and verification that the build complete event is recorded in the internal BuilderOS state.
*   **Build Complete Rejection (Red Health):**
    *   **Precondition:** `builderService.canMarkBuildDone()` returns `RED`.
    *   **Input:** `POST /build/complete` with `{ "token": "xyz", "oil_receipt_ids": ["r1", "r2"] }`.
    *   **Expected Output:** `409 Conflict`.
*   **Isolation:** Confirm through integration tests and monitoring that no LifeOS user features or TSOS customer-facing surfaces are impacted by these changes.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `POST /build/start` or `POST /build/complete` endpoints are not correctly wired or fail to process valid requests.
*   If the internal `recordBuildStart` or `recordBuildComplete` functions do not correctly persist build state.
*   If the `409 Conflict` response is not consistently returned when `canMarkBuildDone` indicates `RED` health.
*   If any unintended side effects are observed on LifeOS user features or TSOS customer-facing surfaces.
*   If the OIL verifier continues to attempt to execute `.md` files as code, indicating a fundamental misconfiguration of the verification environment that prevents proper assessment of the *intended* code changes. This would require a separate remediation for the verifier itself.