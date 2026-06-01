# Amendment 19 Project Governance Proof: G59-100 - Compliance Level Validation

This document serves as a proof-closing blueprint note for Amendment 19, specifically addressing governance proof G59-100 related to project `compliance_level` validation within BuilderOS.

---

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS platform lacks an automated, explicit validation mechanism to ensure that all BuilderOS-governed projects include a `project.json` file with a correctly structured and enumerated `compliance_level` field, as mandated by Amendment 19. Proof G59-100 specifically targets the presence and adherence to the defined enumeration for this field. Without this, manual audits are required, which is inefficient and prone to error.

### 2. Smallest Safe Build Slice to Close It

Implement a new internal BuilderOS utility module responsible for validating the `project.json` schema, with an initial focus on the `compliance_level` field. This module will expose a function that takes a project root path and returns a validation result (success/failure with details). This utility will be integrated into an existing or new BuilderOS internal command for on-demand project validation.

### 3. Exact Safe-Scope Files to Touch First

*   `builderos/src/utils/projectValidator.js` (New file: Contains the core validation logic for `project.json` fields, starting with `compliance_level`.)
*   `builderos/src/commands/validateProject.js` (New file or extension to an existing internal command: Exposes the `projectValidator` utility via a BuilderOS CLI command for internal use.)
*   `builderos/tests/unit/projectValidator.test.js` (New file: Unit tests for the `projectValidator` utility, covering valid and invalid `compliance_level` scenarios.)
*   `builderos/config/amendment19.js` (New file: Defines the allowed enumerations for `compliance_level` as per Amendment 19, to be imported by `projectValidator.js`.)

### 4. Verifier/Runtime Checks

*   **Positive Test Case:** Create a dummy BuilderOS project with a `project.json` containing a valid `compliance_level` (e.g., `"compliance_level": "L3"`). Run `builderos validate-project --path <dummy-project-root>`. Expected outcome: Command exits successfully with a "Project is compliant with Amendment 19 (G59-100)" message.
*   **Negative Test Case (Missing Field):** Create a dummy BuilderOS project with a `project.json` missing the `compliance_level` field. Run `builderos validate-project --path <dummy-project-root>`. Expected outcome: Command exits with an error code and a message indicating "Missing required field: compliance_level".
*   **Negative Test Case (Invalid Value):** Create a dummy BuilderOS project with a `project.json` containing an invalid `compliance_level` (e.g., `"compliance_level": "UNKNOWN"`). Run `builderos validate-project --path <dummy-project-root>`. Expected outcome: Command exits with an error code and a message indicating "Invalid value for compliance_level: UNKNOWN. Must be one of [L1, L2, L3, L4]".
*   **Integration Test (Future):** Once integrated into a CI/CD pipeline or project creation flow, verify that new projects failing this validation are blocked or flagged appropriately.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `validate-project` command incorrectly passes a project with a missing or invalid `compliance_level`.
*   If the `validate-project` command incorrectly fails a project with a correctly specified `compliance_level`.
*   If the validation process introduces significant performance overhead (e.g., >500ms for a typical project validation).
*   If the utility fails to correctly parse a syntactically valid `project.json` file.
*   If the defined enumeration in `builderos/config/amendment19.js` cannot be loaded or is misinterpreted by the validator.