<!-- SYNOPSIS: Amendment 41 MarketingOS Proof G29-100 Remediation Blueprint Note -->

# Amendment 41 MarketingOS Proof G29-100 Remediation Blueprint Note

This document serves as the Single Source of Truth (SSOT) foundation for addressing the OIL verifier rejection related to blueprint processing.

## 1. Exact Missing Implementation or Proof Gap

The BuilderOS verifier environment currently attempts to execute `.md` files as JavaScript modules, leading to a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` during the verification loop. This indicates a fundamental gap in the verifier's file type handling, where documentation and blueprint files are not correctly distinguished from executable code. The proof gap is the absence of explicit configuration or logic within the verifier to identify, parse, and validate `.md` blueprints as non-executable artifacts.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the BuilderOS verifier's internal file processing logic to correctly identify and handle `.md` files. This change must ensure that `.md` files are *read* as text-based documentation rather than being passed to the Node.js module loader for execution. This slice specifically targets the verifier's input pipeline and file type discernment mechanism.

## 3. Exact Safe-Scope Files to Touch First

*   `builderos/verifier/src/fileTypeResolver.js`: Introduce or modify logic to explicitly map `.md` extensions to a 'documentation' or 'blueprint' type, preventing execution attempts.
*   `builderos/verifier/src/verificationEngine.js`: Update the file processing flow to use the `fileTypeResolver` and route `.md` files to a dedicated parser/reader function instead of the module execution path.
*   `builderos/verifier/config/verifierConfig.json`: Potentially add a configuration entry to define known documentation file extensions and their handling.

## 4. Verifier/Runtime Checks

1.  **File Type Resolution Test:** Submit a `.md` file (e.g., `amendment-41-marketingos-proof-g29-100.md`) to the BuilderOS verifier.
    *   **Expected Outcome:** The verifier processes the file without `TypeError [ERR_UNKNOWN_FILE_EXTENSION]`. The internal logs should indicate the file was identified as a 'blueprint' or 'documentation' type.
2.  **Execution Isolation Test:** Ensure that existing `.js` or `.ts` files continue to be executed correctly by the verifier without any new errors or changes in behavior.
3.  **Blueprint Content Readability Test:** (If a blueprint content parser is implemented) Verify that the verifier can successfully read the content of the `.md` file and extract basic metadata (e.g., title, sections) without errors.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` persists for `.md` files.
*   If the verifier attempts to execute `.md` files after the changes.
*   If the changes introduce new `ERR_UNKNOWN_FILE_EXTENSION` or similar errors for other valid code file types (e.g., `.js`, `.ts`).
*   If the verifier's overall performance or stability is negatively impacted.
*   If the verifier fails to correctly identify `.md` files as non-executable documentation.