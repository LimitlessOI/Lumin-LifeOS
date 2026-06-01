# Amendment 19 Project Governance Proof: g35-100 Remediation

This document provides the proof-closing blueprint note for governance checkpoint `g35-100` under Amendment 19 Project Governance, addressing the OIL verifier rejection and defining the next smallest blueprint-backed build slice.

## 1. Exact Missing Implementation or Proof Gap

The immediate gap is the BuilderOS verifier's misinterpretation of `.md` files as executable code, leading to `ERR_UNKNOWN_FILE_EXTENSION`. This indicates a missing explicit file type handling rule for documentation within the BuilderOS verification pipeline.

A secondary gap is the absence of a formally defined, blueprint-backed *next smallest build slice* within the current governance proof that explicitly validates documentation artifacts against governance standards.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice is `g35-100-doc-verify`. This slice focuses on:
*   Establishing correct file type classification for `.md` files within BuilderOS.
*   Implementing a structural and content validation check for `docs/projects/builderos-remediation/*.md` files, ensuring adherence to `AMENDMENT_19_PROJECT_GOVERNANCE.md` principles for proof documents.

## 3. Exact Safe-Scope Files to Touch First

*   `docs/projects/builderos-remediation/amendment-19-project-governance-proof-g35-100.md` (this file): Update with the complete proof-closing blueprint note.
*   `builderos/config/verifier-rules.json`: Add or modify a rule to explicitly classify `.md` files as documentation, preventing execution attempts.
*   `builderos/pipelines/governance-verify.yml`: Update the pipeline to incorporate the new verifier rules and documentation validation steps for the `g35-100-doc-verify` slice.

## 4. Verifier/Runtime Checks

*   **File Type Recognition**: BuilderOS verifier must process `docs/projects/builderos-remediation/amendment-19-project-governance-proof-g35-100.md` as documentation, without `ERR_UNKNOWN_FILE_EXTENSION`.
*   **Structural Validation**: The `g35-100-doc-verify` slice successfully validates the structure and content of this document against `AMENDMENT_19_PROJECT_GOVERNANCE.md` principles.
*   **Slice Execution**: The `g35-100-doc-verify` slice completes successfully in a dry-run, demonstrating correct documentation handling and validation.

## 5. Stop Conditions if Runtime Truth Disagrees

*   Recurrence of `ERR_UNKNOWN_FILE_EXTENSION` for `.md` files.
*   Failure of the `g35-100-doc-verify` slice to execute or validate documentation as specified.
*   Failure of structural or blueprint alignment checks for this proof document.
*   Introduction of regressions or unintended side effects in BuilderOS verification.