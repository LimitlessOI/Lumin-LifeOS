# Amendment 41: MarketingOS Proof - G655-100 Remediation Blueprint

This document serves as the Single Source of Truth (SSOT) foundation for closing the proof gap identified by the OIL verifier rejection for `amendment-41-marketingos-proof-g655-100.md`.

## 1. Exact Missing Implementation or Proof Gap

The OIL verifier is incorrectly attempting to execute documentation files (`.md`) as Node.js modules, leading to a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]`. This indicates a misconfiguration in the verifier's file type handling or the build process's instruction set for documentation assets. Markdown files are static documentation and should not be processed as executable code.

## 2. Smallest Safe Build Slice to Close It

The remediation involves adjusting the BuilderOS build system's OIL verifier configuration to explicitly exclude `.md` files from code execution checks, or to define a specific, non-executable verification pipeline for documentation assets (e.g., Markdown linting, existence checks). The core change is to prevent Node.js from attempting to load `.md` files as ESM modules.

## 3. Exact Safe-Scope Files to Touch First

1.  `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g655-100.md`: This document itself, providing the blueprint.
2.  `[BUILD_SYSTEM_ROOT]/oil-verifier-config.json` (or similar): Update the verifier's configuration to define file type handling rules.
3.  `[BUILD_SYSTEM_ROOT]/scripts/verify-build.js` (or similar build script): Modify the script responsible for invoking the OIL verifier to ensure `.md` files are passed through a documentation-specific check or explicitly ignored by the code execution check.
4.  `package.json`: Review `scripts` section for verifier invocation parameters.

*(Note: Specific file paths for build system configuration are placeholders as they are not provided in the current context. The actual paths must be identified within the BuilderOS build system.)*

## 4. Verifier/Runtime Checks

*   **OIL Verifier Check:** Rerun the full BuilderOS build loop. The OIL verifier must complete without `ERR_UNKNOWN_FILE_EXTENSION` errors for `.md` files. Specifically, the check for `amendment-41-marketingos-proof-g655-100.md` should pass without attempting execution.
*   **Documentation System Check:** Verify that `docs/projects/builderos-remediation/amendment-41-marketingos-proof-g655-100.md` is correctly integrated into the documentation platform (e.g., rendered, discoverable, linked).
*   **Build Log Review:** Confirm that no other non-executable file types are being subjected to Node.js execution checks.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the `ERR_UNKNOWN_FILE_EXTENSION` persists for `.md` files, the verifier configuration change was insufficient or incorrectly applied. Re-evaluate the verifier's invocation parameters and internal logic.
*   If the verifier passes but the documentation file is not correctly processed or displayed by the documentation system, the scope of the fix needs to expand to the documentation build and rendering pipeline.
*   If new `ERR_UNKNOWN_FILE_EXTENSION` errors emerge for other non-executable file types (e.g., `.txt`, `.json` intended as data, not modules), the underlying issue with the verifier's file type identification is broader than initially assessed.