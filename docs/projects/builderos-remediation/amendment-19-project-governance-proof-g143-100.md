<!-- SYNOPSIS: Amendment 19 Project Governance Proof: G143-100 -->

# Amendment 19 Project Governance Proof: G143-100

## Context

This document serves as a proof point for the ongoing remediation efforts related to Amendment 19 Project Governance within the BuilderOS platform. Amendment 19 mandates specific metadata and structural compliance for all BuilderOS-managed projects to ensure consistent governance and discoverability. This proof identifies a critical gap in automated verification and outlines the smallest actionable build slice to address it.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS platform lacks an automated, programmatic mechanism to verify the presence and basic schema compliance of `project.json` files within BuilderOS-managed project directories. This gap prevents systematic enforcement of Amendment 19's project metadata governance requirements, leading to potential inconsistencies and non-compliance across projects.

### 2. Smallest Safe Build Slice to Close It

Implement a core BuilderOS utility function, `validateProjectGovernanceMetadata`, responsible for:
*   Locating `project.json` within a specified project root path.
*   Parsing the `project.json` content.
*   Validating the parsed data against a minimal, predefined JSON schema (e.g., ensuring `id`, `name`, `owner` fields are present and correctly typed).
*   Returning a clear `success` status and, if applicable, a list of validation errors.

This utility will initially be exposed for internal BuilderOS use, allowing for manual or script-based invocation to assess project compliance. It will not yet be integrated into any automated CI/CD pipelines or user-facing surfaces.

### 3. Exact Safe-Scope Files to Touch First

*   `packages/builderos-core/src/utils/projectGovernanceValidator.js` (New file: Contains the `validateProjectGovernanceMetadata` function and related logic.)
*   `packages/builderos-core/src/utils/schemas/projectSchema.js` (New file: Defines the minimal JSON schema for `project.json`.)
*   `packages/builderos-core/tests/unit/projectGovernanceValidator.test.js` (New file: Unit tests for the new utility.)
*   `packages/builderos-core/src/index.js` (Modification: Export `validateProjectGovernanceMetadata` for internal module access.)

### 4. Verifier/Runtime Checks

*   **Unit Tests**: All tests in `packages/builderos-core/tests/unit/projectGovernanceValidator.test.js` must pass, covering cases for:
    *   Valid `project.json` (returns success).
    *   Missing `project.json` (returns failure with specific error).
    *   Malformed `project.json` (e.g., invalid JSON syntax, returns failure with specific error).
    *   `project.json` missing required fields (returns failure with specific schema validation errors).
    *   `project.json` with extra, unexpected fields (should still pass if required fields are present).
*   **Manual Invocation (Dev/Test Environment)**:
    *   Execute the utility against a known compliant BuilderOS project directory. Expected: `success: true`.
    *   Execute the utility against a project directory missing `project.json`. Expected: `success: false`, error indicating file not found.
    *   Execute the utility against a project directory with a `project.json` missing