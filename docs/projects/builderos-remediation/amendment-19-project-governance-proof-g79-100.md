# Amendment 19: Project Governance Proof (G79-100)

## 1. Introduction to Project Governance

This document outlines the governance framework for projects operating within the BuilderOS domain, ensuring alignment with LifeOS platform standards and TSOS customer-facing surface integrity. The primary objective is to establish clear guidelines for project lifecycle management, decision-making processes, and compliance verification, specifically for BuilderOS-only governed loop execution.

## 2. Scope and Principles

*   **Scope:** Applies exclusively to BuilderOS internal projects and their execution loops.
*   **Exclusions:** Does not modify LifeOS user features or TSOS customer-facing surfaces.
*   **Principles:**
    *   **Autonomy within Bounds:** BuilderOS projects operate with high autonomy within defined governance boundaries.
    *   **Verifiable Compliance:** All project outputs and processes must be verifiable against established standards.
    *   **Iterative Improvement:** Governance mechanisms are designed for continuous feedback and adaptation.
    *   **Security First:** All project activities must prioritize platform security and data integrity.

## 3. Project Lifecycle and Verification

Projects within BuilderOS follow a structured lifecycle, with key verification points. This includes initial proposal, design review, implementation, testing, and deployment. Each stage requires adherence to governance policies and successful completion of automated and manual verification steps.

## 4. Proof-Closing Blueprint Note

This section addresses the recent OIL verifier rejection and outlines the next steps for remediation.

### 4.1. Exact Missing Implementation or Proof Gap

The OIL verifier rejected the previous build attempt due to a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".md"`. This indicates that the verifier, or the underlying Node.js runtime it invokes, is attempting to parse or execute `.md` files as ECMAScript modules. The fundamental gap is the lack of explicit instruction or configuration within the build/verification pipeline to correctly identify and handle `.md` files as static documentation rather than executable code.

### 4.2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves updating the OIL verifier's configuration or execution script to explicitly exclude `.md` files from module parsing/execution, or to define a custom loader that treats them as plain text/documentation. This ensures that documentation files are not mistakenly processed as JavaScript modules.

### 4.3. Exact Safe-Scope Files to Touch First

Given the error context (`node:internal/modules/esm/get_format`), the issue lies in how the verifier's execution environment resolves file types. The most direct fix is within the verifier's execution logic.
*   `scripts/oil-verifier.js`: Update this script to filter out `.md` files before attempting to load them as modules.

### 4.4. Verifier/Runtime Checks

1.  **Re-run OIL Verifier:** Execute the `oil-verifier` script. The `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` for `.md` files must no longer occur.
2.  **Build Completion:** Ensure the overall build process completes successfully without errors related to file type parsing for documentation.
3.  **Documentation Integrity:** Verify that `.md` files are still accessible and rendered correctly as documentation within any relevant documentation portals or build artifacts.

### 4.5. Stop Conditions if Runtime Truth Disagrees

*   If the `ERR_UNKNOWN_FILE_EXTENSION` persists for `.md` files after applying the changes.
*   If the proposed changes inadvertently prevent other legitimate module types (e.g., `.js`, `.mjs`, `.ts`) from being correctly processed by the verifier.
*   If the build system's architecture does not allow for the proposed modifications to `scripts/oil-verifier.js` or equivalent configuration files without significant refactoring. In such a case, a deeper investigation into the build system's module resolution and asset pipeline would be required.