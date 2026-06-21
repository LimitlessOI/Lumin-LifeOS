<!-- SYNOPSIS: Amendment 41 MarketingOS Proof G119-100: OIL Verifier Remediation for .md File Execution -->

# Amendment 41 MarketingOS Proof G119-100: OIL Verifier Remediation for .md File Execution

**SSOT Foundation Note**

This document outlines the remediation plan for the OIL Verifier rejection related to the incorrect handling of `.md` files as executable Node.js modules.

---

### 1. Exact Missing Implementation or Proof Gap

The OIL Verifier, in its current configuration, attempts to execute `.md` files as ECMAScript modules, leading to a `TypeError [ERR_UNKNOWN_FILE_EXTENSION]`. This indicates a fundamental misinterpretation of file types within the verifier's execution context. Markdown files are documentation artifacts and are not intended for direct execution by Node.js. The gap is the verifier's lack of a mechanism to correctly identify and skip (or parse as documentation) non-executable file types, specifically `.md` files, when performing syntax checks or module loading.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adjusting the OIL Verifier's configuration or the build script that invokes it, to explicitly exclude `.md` files from Node.js module parsing/execution attempts. This is a configuration change to the verifier's input scope, not a modification of the `.md` file content itself.

### 3. Exact Safe-Scope Files to Touch First

*   `package.json`: Review `scripts` section for verifier invocation.
*   `build/oil-verifier.js` (or similar): If a dedicated verifier script exists, modify its file filtering logic.
*   `build/config/verifier.json` (or similar): If a configuration file dictates verifier scope, update it.

**Proposed Action:**
Modify the verifier invocation command or configuration to explicitly exclude `docs/**/*.md` paths from being treated as executable code. For example, if the verifier is invoked via a glob pattern, refine the pattern to exclude `.md` files. If it's a custom script, add a filter.

Example (conceptual `package.json` script modification):
```json
"scripts": {
  "verify:oil": "node ./build/oil-verifier.js --exclude-patterns='**/*.md' --include-patterns='src/**/*.js,src/**/*.mjs'"
}
```
*(Note: The exact syntax will depend on the actual verifier implementation and its CLI arguments or configuration schema.)*

### 4. Verifier/Runtime Checks

*   **Successful Verifier Pass:** The primary check is that the OIL Verifier completes its run without encountering `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` for any `.md` file.
*   **Documentation Integrity:** Ensure that `.md` files are still accessible and render correctly as documentation, confirming that the exclusion from verifier execution does not inadvertently delete or corrupt them.
*   **No New Failures:** Verify that the change does not introduce new syntax errors or runtime issues in actual executable code files.

### 5. Stop Conditions if Runtime Truth Disagrees

If, after implementing the proposed changes:
*   The `ERR_UNKNOWN_FILE_EXTENSION` error persists for `.md` files.
*   New, unrelated syntax errors or module loading issues appear in executable code.
*   The verifier fails to run entirely or reports unexpected errors.

Then, stop the current remediation path. This would indicate that the verifier's internal logic for file type detection or module loading is more complex than a simple configuration exclusion, or that the build system has an underlying mechanism forcing `.md` files into the Node.js execution context. Further investigation into the verifier's source code or the build environment's module resolution strategy would be required.