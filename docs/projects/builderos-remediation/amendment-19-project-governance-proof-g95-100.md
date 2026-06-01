# Amendment 19 Project Governance Proof: G95-100

This document serves as a proof-closing blueprint note for governance clauses G95-100 of Amendment 19, focusing on the finalization and archival aspects of project governance.

## 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of an automated, observable verification mechanism within BuilderOS to confirm the consistent application and recording of final project closure procedures, reporting, and archival as mandated by Amendment 19, specifically clauses G95-100. This includes ensuring that all projects governed by Amendment 19, upon reaching a "Closed" or "Archived" status, have completed their final reporting and data archival requirements according to the blueprint.

## 2. Smallest Safe Build Slice to Close It

Implement a new BuilderOS verification module that performs automated checks for projects transitioning to or marked as "Closed" or "Archived" under Amendment 19. This module will:
1.  Identify projects within the BuilderOS registry that are governed by Amendment 19 and have reached a final state.
2.  Scan designated project directories for the presence of required final documentation (e.g., `final_project_report.md`, `archival_manifest.json`).
3.  Perform basic content validation on these documents (e.g., checking for specific headers, keywords, or structural elements).
4.  Record verification outcomes in BuilderOS audit logs and update project metadata with compliance status.

This slice focuses on establishing the *observability* and *auditing* of final governance compliance without altering core project lifecycle management.

## 3. Exact Safe-Scope Files to Touch First

*   `builderos/verification/amendment-19-g95-100-final-report-check.js` (New file): Contains the Node.js script for the verification logic.
*   `builderos/config/verification-rules.json` (Existing, extend): Add a new entry for `amendment-19-g95-100-final-report-check` defining its trigger conditions and parameters.
*   `docs/projects/builderos-remediation/amendment-19-project-governance-proof-g95-100.md` (This file): Documents the proof and implementation plan.

## 4. Verifier/Runtime Checks

*   **Presence Check:** For any project marked "Closed" or "Archived" under Amendment 19, verify the existence of `project_root/final_report/final_project_report.md` and `project_root/archive/archival_manifest.json`.
*   **Content Validation:**
    *   `final_project_report.md`: Check for the presence of a "Compliance Statement: Amendment 19" section and a "Project Closure Date" field.
    *   `archival_manifest.json`: Verify it's a valid JSON structure and contains a `files_archived` array with at least one entry.
*   **Status Consistency:** Confirm that the `project.status` in the BuilderOS registry accurately reflects "Closed" or "Archived" for projects passing these checks.
*   **Audit Logging:** Ensure that each verification run generates a detailed log entry in BuilderOS's audit system, indicating success or specific failure points.

## 5. Stop Conditions if Runtime Truth Disagrees

*   **Missing Artifacts:** If `final_project_report.md` or `archival_manifest.json` are consistently missing for multiple projects marked "Closed" under Amendment 19, indicating a systemic failure in project finalization procedures.
*   **Content Non-Compliance:** If a significant percentage of existing final reports or manifests fail content validation checks, suggesting a breakdown in reporting standards.
*   **Verification Script Errors:** If the `amendment-19-g95-1