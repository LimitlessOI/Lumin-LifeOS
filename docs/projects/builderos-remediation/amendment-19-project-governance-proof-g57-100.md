<!-- SYNOPSIS: Amendment 19 Project Governance Proof: G57-100 - Project Metadata Compliance -->

# Amendment 19 Project Governance Proof: G57-100 - Project Metadata Compliance

This document serves as a proof-of-concept and initial build slice for validating compliance with Amendment 19, specifically focusing on project metadata governance (G57-100).

---

## Proof-Closing Blueprint Note

**1. Exact missing implementation or proof gap:**
The current BuilderOS platform lacks an automated, systematic mechanism to verify that all managed projects adhere to the Amendment 19 requirement for project metadata, specifically the presence and validity of the `governance_contact_email` field within `project.json` at the project root. This gap prevents proactive identification and remediation of non-compliant projects.

**2. Smallest safe build slice to close it:**
Implement a read-only BuilderOS internal validation service and a corresponding CLI command. This service will scan all active BuilderOS-managed projects, attempt to read their `project.json` file, and validate the existence and format of the `governance_contact_email` field. The CLI command will trigger this scan and output a report detailing compliant and non-compliant projects, along with specific reasons for non-compliance. This slice focuses solely on reporting and does not implement any enforcement or modification.

**3. Exact safe-scope files to touch first:**
*   `builderos/services/ProjectGovernanceValidator.js`: New service module containing the core validation logic.
*   `builderos/cli/commands/validate-governance.js`: New CLI command module to expose the validator functionality.
*   `builderos/lib/project-utils.js`: Extend existing utility (if present) or create a new helper function to safely read and parse `project.json` files. (Assuming `readProjectConfig` exists and can be extended or used).
*   `builderos/config/email-regex.js`: (If not already present) A utility for email validation regex.

**4. Verifier/runtime checks:**
*   Execute the new CLI command: `node builderos/cli/index.js validate-governance`.
*   **Positive Test Cases:**
    *   Create a test project with a valid `project.json` including a well-formed `governance_contact_email`. Verify it's reported as compliant.
    *   Create a test project *without* a `project.json`. Verify it's reported as non-compliant (missing file).
    *   Create a test project with `project.json` but *missing* the `governance_contact_email` field. Verify it's reported as non-compliant (missing field).
    *   Create a test project with `project.json` and `governance_contact_email` but with an *invalid* email format (e.g., "not-an-email"). Verify it's reported as non-compliant (invalid format).
*   **Negative Test Cases:**
    *   Ensure no compliant projects are incorrectly flagged as non-compliant.
*   **Output Verification:**
    *   The command output should clearly distinguish between compliant and non-compliant projects.
    *   For non-compliant projects, the output must specify the exact reason (e.g., "missing project.json