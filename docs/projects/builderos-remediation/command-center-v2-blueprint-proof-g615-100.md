The source blueprint `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md` was not provided in the REPO FILE CONTENTS, so the specific details of the missing implementation or proof gap are inferred based on the task context.
---
# BuilderOS Remediation: Command Center V2 Blueprint Proof (G615-100)

This document serves as a proof-closing note for the initial build slice of Command Center V2, addressing the signal to derive the next smallest blueprint-backed build slice.

## 1. Exact Missing Implementation or Proof Gap

The `COMMAND_CENTER_V2_BLUEPRINT.md` (not provided, inferred) implies a need for enhanced internal BuilderOS control and visibility. The immediate gap identified is the lack of a dedicated, versioned internal API endpoint for BuilderOS to report and update the status of individual build tasks, which is crucial for the Command Center's operational loop. This gap prevents real-time task state synchronization and robust error handling within BuilderOS's internal orchestration.

## 2. Smallest Safe Build Slice to Close It

Implement a minimal, internal-only BuilderOS v2 API endpoint: `POST /builder-os/v2/tasks/:taskId/status`. This endpoint will accept a `taskId` and a `newStatus` (e.g., `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`) to update the internal state of a BuilderOS task. This slice focuses solely on the API surface and its immediate persistence, without touching external integrations or complex business logic.

## 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/api/v2/task-status-handler.js` (NEW): Contains the handler logic for the `POST /builder-os/v2/tasks/:taskId/status` endpoint.
*   `src/builder-os/api/v2/routes.js` (UPDATE): Registers the new `task-status-handler` with the BuilderOS internal API router.
*   `src/builder-os/data/task-repository.js` (UPDATE): Adds a new method, `updateTaskStatus(taskId, newStatus)`, to persist the status change in the internal BuilderOS data store.
*   `tests/builder-os/api/v2/task-status-handler.test.js` (NEW): Unit tests for the `task-status-handler`.
*   `tests/builder-os/data/task-repository.test.js` (UPDATE): Adds tests for the `updateTaskStatus` method.

## 4. Verifier/Runtime Checks

*   **Unit Tests:** All new and modified unit tests (e.g., `task-status-handler.test.js`, `task-repository.test.js`) pass with 100% coverage for the new code paths.
*   **Integration Test:**
    *   Start BuilderOS in a test environment.
    *   Send a `POST` request to `http://localhost:<BUILDEROS_INTERNAL_PORT>/builder-os/v2/tasks/test-task-123/status` with a payload `{ "newStatus": "RUNNING" }`.
    *   Verify the API returns a `200 OK` status.
    *   Query the internal BuilderOS task state (e.g., via a debug endpoint or direct database inspection in test) to confirm `test-task-123`'s status is now `RUNNING`.
*   **Logging:** Monitor BuilderOS internal logs for successful processing of the status update request and absence of errors related to the new endpoint.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **API Response:** The `POST /builder-os/v2/tasks/:taskId/status` endpoint returns any non-2xx HTTP status code (e.g., 400, 500).
*   **Data Inconsistency:** The internal BuilderOS task state does not accurately reflect the `newStatus` sent via the API after a successful API response.
*   **Regression:** Any existing BuilderOS internal API endpoints or core task processing logic exhibits new failures or unexpected behavior (e.g., existing build tasks fail to start or complete).
*   **Performance Degradation:** Significant increase in latency for existing BuilderOS operations or excessive resource consumption (CPU, memory) after deploying this slice.