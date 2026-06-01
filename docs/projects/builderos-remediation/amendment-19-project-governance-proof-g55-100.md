# Amendment 19 Project Governance Proof: G55-100 - Project State Reporting Validation

This document outlines the next smallest build slice to provide proof of compliance for Amendment 19 Project Governance, specifically focusing on automated validation of project state reporting.

---

### 1. The exact missing implementation or proof gap

The current gap is the lack of an automated, verifiable mechanism to prove that project state reports, particularly the `project_status` field and its update frequency, adhere to the requirements stipulated in Amendment 19. While the amendment defines the governance rules, there is no active, internal BuilderOS component that programmatically checks and reports on this compliance.

### 2. The smallest safe build slice to close it

Implement a new internal BuilderOS utility function, `validateProjectStateCompliance`, that takes a project's current state object as input. This function will:
1.  Verify that the `project_status` field exists and conforms to a predefined schema (e.g., enum of allowed states, specific string format).
2.  Check the `last_updated_at` timestamp of the project state against the required update frequency defined in governance rules.
3.  Return a boolean indicating compliance and a detailed report of any non-compliance findings.

This slice focuses solely on the validation logic, not on its integration into a larger reporting or enforcement system.

### 3. Exact safe-scope files to touch first

*   `src/builder-os/utils/project-governance-validator.js` (new file): Contains the `validateProjectStateCompliance` function.
*   `src/builder-os/config/governance-rules.js` (new file or extend existing): Defines the expected `project_status` schema and update frequency requirements.
*   `tests/builder-os/utils/project-governance-validator.test.js` (new file): Unit tests for the `validateProjectStateCompliance` function.

### 4. Verifier/runtime checks

*   **Unit Tests:**
    *   `npm test tests/builder-os/utils/project-governance-validator.test.js`
    *   Test cases must cover:
        *   Valid project state (correct `project_status`, recent update).
        *   Invalid `project_status` format/value.
        *   Outdated `last_updated_at` timestamp.
        *   Missing `project_status` field.
        *   Edge cases for update frequency (e.g., exactly on the boundary).
*   **Internal BuilderOS Console Check (Manual):**
    *   After deployment, manually invoke the `validateProjectStateCompliance` function with known compliant and non-compliant project data via a BuilderOS internal console or script.
    *   Verify that the function's output correctly identifies compliance status and provides accurate reasons for non-compliance.

### 5. Stop conditions if runtime truth disagrees

*   If `validateProjectStateCompliance` incorrectly flags a demonstrably compliant project as non-compliant.
*   If `validateProjectStateCompliance` fails to flag a demonstrably non-compliant project as non-compliant.
*   If the function introduces any measurable performance degradation to BuilderOS internal processes when run against a representative dataset.
*   If the validation logic cannot be clearly mapped back to specific clauses in `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`.