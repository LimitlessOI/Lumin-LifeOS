# Command Center V2 Blueprint Proof: G22-100 Remediation

## Blueprint Note: OIL Verifier File Type Misinterpretation

This document addresses the OIL verifier rejection related to `ERR_UNKNOWN_FILE_EXTENSION` when processing `.md` files. The core issue is the verifier's attempt to execute documentation files as Node.js modules, which is an incorrect operational mode for static content.

### 1. Exact Missing Implementation or Proof Gap

The BuilderOS verification pipeline, specifically the OIL verifier, lacks a robust file type classification and routing mechanism. It currently defaults to attempting Node.js module parsing for all files within its scope, leading to `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` for non-executable file types like Markdown (`.md`). The proof gap is the absence of a distinct processing path for documentation and static assets, preventing their correct validation (e.g., linting) without triggering execution-oriented errors.

### 2. Smallest Safe Build Slice to Close It

Implement a preliminary file type detection and dispatch layer within the OIL verifier. This layer will:
a. Identify file extensions (e.g., `.js`, `.mjs`, `.md`).
b. Route files with executable extensions to the existing Node.js module syntax checker.
c. Route files with documentation extensions (e.g., `.md`) to a dedicated, non-executable content validator (e.g., a Markdown linter).
This slice focuses solely on correct file type identification and initial routing, without altering the core logic of existing verifiers for code files.

### 3. Exact Safe-Scope Files to Touch First

*   `builder-os/verifier/oil-verifier-entrypoint.js`: Introduce the file type detection and dispatch logic here. This file acts as the primary orchestrator for verification passes.
*   `builder-os/verifier/utils/file-classifier.js` (new file): A utility module responsible for determining file type based on extension and potentially content heuristics.
*   `builder-os/verifier/handlers/markdown-content-validator.js` (new file): A placeholder or initial implementation for a Markdown linter/validator. Initially, this can be a no-op or a simple existence check to prevent the `ERR_UNKNOWN_FILE_EXTENSION`.
*   `builder-os/config/verifier-rules.json`: Update to include new rules or configurations for markdown validation, even if initially minimal.

### 4. Verifier/Runtime Checks

*   **Verifier Check (Unit/Integration):**
    *   Create test cases with `.js` files that pass/fail Node.js syntax checks. Ensure existing behavior is preserved.
    *   Create test cases with `.md` files. Verify that these files no longer trigger `ERR_UNKNOWN_FILE_EXTENSION` and instead pass through the new markdown handler without error (even if the handler is initially basic).
    *   Ensure no new `ERR_UNKNOWN_FILE_EXTENSION` errors appear for other non-JS file types.
*   **Runtime Check (E2E/Deployment):**
    *   Deploy the updated BuilderOS verifier to a staging environment.
    *   Submit a build containing both valid `.js` code and valid `.md` documentation.
    *   Confirm the build passes verification without the reported `ERR_UNKNOWN_FILE_EXTENSION` for `.md` files.
    *   Confirm that `.js` files are still correctly verified for syntax.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `ERR_UNKNOWN_FILE_EXTENSION` error for `.md` files persists or reappears.
*   If the new file classification logic incorrectly routes `.js` files, causing them to bypass Node.js syntax checks or trigger new errors.
*   If the introduction of `file-classifier.js` or `markdown-content-validator.js` introduces new, unrelated build failures or performance regressions.
*   If the verifier fails to process any file type that previously worked correctly.