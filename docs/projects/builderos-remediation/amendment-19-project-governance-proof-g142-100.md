<!-- SYNOPSIS: Amendment 19 Project Governance Proof: G142-100 - Project Root `project.json` Validation -->

# Amendment 19 Project Governance Proof: G142-100 - Project Root `project.json` Validation

**Source Blueprint:** `docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md`

## Proof-Closing Blueprint Note

This document serves as a proof for governance goal `G142-100`, which mandates that all BuilderOS projects must have a `project.json` file at their root containing essential metadata, specifically `projectId` and `ownerId`. This proof outlines the initial build slice to establish a foundational validation mechanism for this requirement.

1.  **Exact missing implementation or proof gap:**
    The core gap is the absence of an automated, internal BuilderOS mechanism to validate the existence and basic schema of `project.json` files within project roots. This proof focuses on implementing a utility to perform this check, laying the groundwork for integration into BuilderOS project lifecycle events.

2.  **Smallest safe build slice to close it:**
    Implement a dedicated, internal BuilderOS utility function (`validateProjectJson`) that takes a project root path, reads `project.json`, and verifies the presence and basic type (string) of `projectId` and `ownerId` fields. This utility will return a boolean indicating validity and an array of errors if invalid.

3.  **Exact safe-scope files to touch first:**
    *   `builder-os/src/project-governance/projectJsonValidator.js` (new file)
    *   `builder-os/src/project-governance/index.js` (export `validateProjectJson`)
    *   `builder-os/tests/project-governance/projectJsonValidator.test.js` (new file)

4.  **Verifier/runtime checks:**
    *   **Unit Tests:** Execute `builder-os/tests/project-governance/projectJsonValidator.test.js` to confirm the utility correctly identifies valid and invalid `project.json` structures (missing file, missing fields, incorrect field types).
    *   **Manual Integration Test (Dev Environment):** Temporarily integrate `validateProjectJson` into a BuilderOS internal script (e.g., a local project linter or a mock project creation flow) to verify its behavior against actual project directories.
    *   **Logging:** Ensure the validator produces clear, actionable error messages when a `project.json` is invalid.

5.  **Stop conditions if runtime truth disagrees:**
    *   The `validateProjectJson` utility incorrectly passes projects with missing or malformed `projectId` or `ownerId`.
    *   The utility incorrectly fails projects with correctly formed `projectId` and `ownerId`.
    *   Reading `project.json` introduces unexpected I/O errors or performance bottlenecks for typical project sizes.
    *   The defined schema (`projectId` and `ownerId` as simple strings) proves insufficient for immediate governance needs, requiring a more complex validation (e.g., regex patterns, UUID format checks).