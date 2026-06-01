# Amendment 19 Project Governance Proof: G25-100

This document serves as a proof-closing blueprint note for the implementation slice related to Amendment 19, Section G25, Item 100, concerning foundational project governance metadata.

---

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS project creation and initialization flow does not consistently enforce the presence and basic schema validation of a `project.governance.json` file at the root of newly provisioned projects. This gap prevents early and automated adherence to Amendment 19's mandate for foundational project governance metadata, specifically regarding project ownership, review policies, and compliance levels.

### 2. Smallest Safe Build Slice to Close It

Implement a mandatory post-project-creation validation step within BuilderOS. This step will:
a. Verify the existence of `project.governance.json` in the newly created project root.
b. Perform a basic JSON schema validation of `project.governance.json` against a predefined `builder-os/schemas/project-governance-schema.json`.
c. If validation fails or the file is missing, the project creation process must halt, or a critical warning/error must be logged, preventing the project from being marked as "ready" for further BuilderOS operations until rectified.

### 3. Exact Safe-Scope Files to Touch First

*   `builder-os/src/project-init/post-creation-validator.js` (New file: Implements the validation logic for `project.governance.json`.)
*   `builder-os/schemas/project-governance-schema.json` (New file: Defines the JSON schema for `project.governance.json`.)
*   `builder-os/src/project-init/index.js` (Modify: Integrate the `post-creation-validator` into the project initialization workflow.)
*   `builder-os/src/errors/BuilderOSErrors.js` (Modify: Add new error types for `MissingProjectGovernanceFileError` and `InvalidProjectGovernanceSchemaError`.)
*   `builder-os/test/project-init/post-creation-validator.test.js` (New file: Unit tests for the validator.)

### 4. Verifier/Runtime Checks

*   **Unit Tests:**
    *   `post-creation-validator.test.js`: Verify that projects without `project.governance.json` trigger a `MissingProjectGovernanceFileError`.
    *   `post-creation-validator.test.js`: Verify that projects with an invalid `project.governance.json` schema trigger an `InvalidProjectGovernanceSchemaError`.
    *   `post-creation-validator.