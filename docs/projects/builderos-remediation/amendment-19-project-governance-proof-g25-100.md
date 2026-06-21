<!-- SYNOPSIS: Amendment 19 Project Governance Proof: G25-100 - Project Lead Assignment Verification -->

# Amendment 19 Project Governance Proof: G25-100 - Project Lead Assignment Verification

This document serves as a proof-closing blueprint note for `G25-100`, addressing the verifiable tracking of `ProjectLead` assignments within BuilderOS projects as mandated by `AMENDMENT_19_PROJECT_GOVERNANCE.md`.

---

**1. Exact missing implementation or proof gap:**
The current BuilderOS platform lacks a standardized, auditable mechanism to programmatically verify the `ProjectLead` assigned to a given project. While assignments may exist in various internal records, a unified, accessible, and API-driven proof point for `G25-100` is absent. This gap prevents automated governance checks and transparent reporting on project leadership.

**2. Smallest safe build slice to close it:**
Implement a read-only API endpoint within BuilderOS that exposes the `ProjectLead` for a specified project. This endpoint will leverage existing project metadata to retrieve and present the assigned lead, ensuring no new data entry or modification capabilities are introduced in this slice. The focus is solely on verifiable retrieval.

**3. Exact safe-scope files to touch first:**
*   `services/builderos/project-metadata-service.js`: Extend an existing or create a new method (e.g., `getProjectLead(projectId)`) to query internal project metadata for the assigned `ProjectLead` identifier. This method should be read-only and idempotent.
*   `routes/builderos/project-governance-routes.js`: Add a new GET route, e.g., `/builderos/v1/projects/:projectId/lead`, which utilizes the `project-metadata-service` to return the `ProjectLead` information.
*   `tests/unit/builderos/project-governance.test.js`: Add unit tests for the new service method and the new route, covering success cases, project not found, and cases where a lead is not assigned.
*   `docs/api/builderos/project-governance.yaml`: Update the OpenAPI specification to include the new `/builderos/v1/projects/:projectId/lead` endpoint.

**4. Verifier/runtime checks:**
*   **API Call Verification:**
    *   `GET /builderos/v1/projects/{validProjectId}/lead` returns HTTP 200 OK with a JSON payload: `{ "projectId": "...", "projectLeadId": "...", "projectLeadName": "..." }`.
    *   `GET /builderos/v1/projects/{nonExistentProjectId}/lead` returns HTTP 404 Not Found.
    *   `GET /builderos/v1/projects/{projectIdWithoutLead}/lead` returns HTTP 200 OK with a payload indicating no lead (e.g., `{ "projectId": "...", "projectLeadId": null, "projectLeadName": null }`).
*   **Data Integrity Check:** The `projectLeadId` and `projectLeadName` returned by the API must precisely match the authoritative internal project metadata records for the given `projectId`.
*   **Authorization Check:** Verify that only authenticated and authorized BuilderOS users can access this endpoint. Unauthorized access should result in HTTP 403 Forbidden.
*   **Performance Check:** Response time for the endpoint should be consistently under 100ms for typical project queries.

**5. Stop conditions if runtime truth disagrees:**
*   If the API endpoint returns incorrect `ProjectLead` data (mismatch with authoritative source).
*   If the endpoint exposes any data beyond the `ProjectLead` identifier and name for the specified project.
*   If the endpoint introduces write operations or modifies any project state.
*   If the endpoint's performance degrades significantly under load, impacting BuilderOS stability.
*   If the endpoint is accessible without proper BuilderOS authentication/authorization.