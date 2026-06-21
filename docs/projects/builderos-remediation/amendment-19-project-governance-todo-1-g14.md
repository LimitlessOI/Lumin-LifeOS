<!-- SYNOPSIS: Documentation — Amendment 19 Project Governance Todo 1 G14. -->

BuilderOS Blueprint Enhancement Memo: Amendment 19 Project Governance - TODO-1-G14

This memo addresses the immediate blocking tasks identified in the `AMENDMENT_19_PROJECT_GOVERNANCE.md` blueprint, specifically the "decision debt surface (no endpoint yet)" and "project drawer detail fix (nested `project` object)". The goal is to define the necessary next steps for BuilderOS.

1.  **Blocking Ambiguity / Founder Decision List:**
    *   **Decision Debt Surface:** The exact scope, data model, and API endpoint for the "decision debt surface" are undefined. Founder input is required to specify what data points constitute "decision debt" and how they should be exposed. This is a blocking dependency for any implementation.
    *   **Project Drawer Detail Fix:** Clarify the *desired* flattened structure for the `project` object within the project drawer context. Specifically, identify the current nested path and the target direct path for project attributes.

2.  **Already-Settled Constraints:**
    *   Execution is strictly within the BuilderOS-governed loop.
    *   No modifications to LifeOS user features or TSOS customer-facing surfaces.
    *   Implementation must adhere to approved Builder safe scope.
    *   Focus on minimal changes aligned with the blueprint.

3.  **Smallest Buildable Next Slice (Platform):**
    *   **Task:** Implement the "project drawer detail fix" by flattening the `project` object structure for the project drawer display.
    *   **Scope:** Identify and adjust the data transformation layer responsible for preparing project details for the project drawer. This will likely involve a data mapping or DTO adjustment.
    *   **Example (Conceptual):** Transform `{ data: { project: { id: 'p1', name: 'Project A' } } }` to `{ id: 'p1', name: 'Project A' }` or `{ project: { id: 'p1', name: 'Project A' } }` if the outer `project` key is desired.

4.  **Exact Safe-Scope Files BuilderOS Should Touch First:**
    *   `src/builder-os/services/project-data-transformer.js` (or similar data transformation service)
    *   `src/builder-os/dtos/project-drawer-dto.js` (if DTOs are used for API responses)
    *   `src/builder-os/api/project-drawer-api.js` (if the transformation happens at the API response level)
    *   `tests/builder-os/services/project-data-transformer.test.js`

5.  **Required Verifier/Runtime Checks:**
    *   Unit tests for the `project-data-transformer` ensuring correct flattening.
    *   Integration tests verifying the project drawer API returns the flattened structure.
    *   Schema validation on the output of the project drawer data endpoint.

6.  **Stop Conditions:**
    *   The `project` object is correctly flattened and consumed by the project drawer without errors.
    *   All associated unit and integration tests pass.
    *   The `project drawer detail fix` task in `AMENDMENT_19_PROJECT_GOVERNANCE.md` can be marked `[done]`.