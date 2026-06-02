# Amendment 12 Command Center Proof: G85-100 - Initial Remediation Task Orchestration

This document outlines the proof-closing blueprint note for the initial build slice of the G85 Remediation Control Plane, specifically focusing on G85.1: Remediation Task Orchestration.

---

### Blueprint Note: G85.1 Initial Remediation Task Orchestration

**1. Exact missing implementation or proof gap:**
The core mechanism for initiating and managing remediation tasks within BuilderOS is missing. Specifically, the foundational service and data model to accept a remediation request, create a task, and establish its initial state.

**2. Smallest safe build slice to close it:**
Implement a minimal `RemediationTaskOrchestrator` service capable of receiving a remediation request payload, generating a unique task ID, setting the task's initial status to `PENDING`, and persisting this task. This slice focuses solely on task creation and initial state assignment, without implementing task execution or advanced state transitions.

**3. Exact safe-scope files to touch first:**
-   `src/builderos/remediation/orchestration/RemediationTaskOrchestrator.js`: New service to encapsulate task creation logic.
-   `src/builderos/remediation/models/RemediationTask.js`: New data model definition for a remediation task (e.g., `id`, `status`, `type`, `payload`, `createdAt`).
-   `src/builderos/remediation/constants/RemediationTaskStatus.js`: New file defining enumeration for remediation task statuses (e.g., `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`).
-   `src/builderos/remediation/api/routes/remediationTasks.js`: New internal BuilderOS API endpoint (`POST /builderos/remediation/tasks`) to expose the task creation functionality.
-   `src/builderos/remediation/orchestration/RemediationTaskOrchestrator.test.js`: Unit tests for the `RemediationTaskOrchestrator`.

**4. Verifier/runtime checks:**
-   **Unit Tests:**
    -   Verify `RemediationTaskOrchestrator.createTask()` successfully creates a task object with a unique ID and `status: PENDING` given a valid payload.
    -   Verify `RemediationTaskOrchestrator.createTask()` handles invalid payloads gracefully (e.g., throws an error or returns a specific error structure).
-   **Integration Tests:**
    -   Send a `POST` request to `/builderos/remediation/tasks` with a sample remediation payload. Assert