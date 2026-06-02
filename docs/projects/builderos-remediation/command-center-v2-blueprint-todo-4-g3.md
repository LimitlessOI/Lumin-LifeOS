### BuilderOS Remediation: Command Center V2 Blueprint Enhancement Memo (TODO-4-G3)

**Context:** This memo addresses the open task within Build Phase 2 (sections F, H) of `docs/projects/COMMAND_CENTER_V2_BLUEPRINT.md`, specifically regarding the initial BuilderOS integration with the Command Center's core data model. The goal is to define a smallest buildable slice to unblock progress.

1.  **Blocking Ambiguity / Founder Decision List:**
    *   **F.1 Data Model Granularity:** What is the precise initial data model for a "BuilderOS Task" or "Project State" as exposed by the Command Center API? Specifically, which fields are mandatory for MVP (e.g., `id`, `name`, `status`, `progress_percentage`, `last_updated_at`)?
    *   **H.1 API Endpoint Definition:** What is the exact API endpoint (path, method) BuilderOS should use to *read* the status of its assigned tasks/projects? Is it RESTful (`GET /api/v2/builder-tasks/{id}`), GraphQL, or RPC?
    *   **H.2 Authentication/Authorization:** What is the mechanism for BuilderOS to authenticate with the Command Center API for these read operations? (e.g., API key, OAuth token, internal service account).

2.  **Already-Settled Constraints:**
    *   **F.2 Core Entity:** The Command Center will manage a core entity representing a "BuilderOS Task" or "Project" with a unique identifier.
    *   **H.3 BuilderOS-only Scope:** Initial integration is strictly for BuilderOS internal consumption; no LifeOS user-facing or TSOS customer-facing surfaces are modified by this slice.
    *   **F.3 Read Capability:** The Command Center API must support reading the current state of BuilderOS-managed entities.

3.  **Smallest Buildable Next Slice:**
    *   Implement a minimal Command Center API endpoint (`GET /api/v2/builder-tasks/{id}`) to retrieve a single BuilderOS task's `id`, `name`, and `status`.
    *   Implement a corresponding BuilderOS internal service method to consume this endpoint and log the task status.
    *   Define a placeholder data structure for `BuilderTask` in the Command Center backend with `id`, `name`, `status` fields.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First:**
    *   `services/command-center-api/src/routes/v2/builderTasks.js` (new file for API endpoint)
    *   `services/command-center-api/src/models/BuilderTask.js` (new file for data model definition)
    *   `services/builderos/src/api/commandCenterClient.js` (new file for BuilderOS API client)
    *   `services/builderos/src/tasks/statusMonitor.js` (modification to call new client)
    *   `docs/api/command-center-v2-builder-tasks.md` (new file for API documentation)

5.  **Required Verifier/Runtime Checks:**
    *   **API Endpoint Test:** `curl -H "Authorization: Bearer <BUILDEROS_TOKEN>" http://localhost:8080/api/v2/builder-tasks/123` returns a 200 OK with expected `id`, `name`, `status` fields.
    *   **BuilderOS Client Test:** BuilderOS logs a successful fetch of a task status without errors.
    *   **Schema Validation:** The returned JSON adheres to the defined `BuilderTask` schema.

6.  **Stop Conditions:**
    *   The `GET /api/v2/builder-tasks/{id}` endpoint is deployed and returns a valid, minimal `BuilderTask` object.
    *   BuilderOS can successfully make a `GET` request to this endpoint and parse the response.
    *   The initial API documentation for this endpoint is committed.
    *   All blocking ambiguities (F.1, H.1, H.2) are resolved by founder decision or explicit blueprint update.