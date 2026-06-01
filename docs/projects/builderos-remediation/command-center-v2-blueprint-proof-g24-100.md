# Command Center V2 Blueprint Proof: G24-100 - OIL Verifier Remediation

## Blueprint Note: Addressing OIL Verifier Rejection for .md Files

This note addresses the OIL verifier rejection related to `.md` file processing, specifically `ERR_UNKNOWN_FILE_EXTENSION` when attempting to parse documentation as executable code. This remediation ensures BuilderOS can correctly process and store blueprint-backed proof documents without triggering erroneous syntax checks.

### 1. Exact Missing Implementation or Proof Gap

The OIL verifier, in its current configuration or execution context, attempts to perform JavaScript module syntax checks on `.md` files. This is a misapplication of the verifier's scope, as `.md` files are documentation and not executable code. The proof gap is the lack of explicit exclusion or correct file type handling for non-code assets within the BuilderOS verification pipeline, leading to false-positive rejections for valid documentation.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves updating the BuilderOS OIL verifier configuration to explicitly exclude `.md` files from JavaScript syntax parsing. This ensures that documentation files are not mistakenly treated as source code modules, allowing the build loop to proceed with valid proof artifacts.

### 3. Exact Safe-Scope Files to Touch First

*   `builderos/config/oil-verifier.js` (or similar verifier configuration file)
*   `builderos/scripts/run-oil-verifier.js` (or the script that invokes the verifier)

**Proposed Change (Conceptual):**
Modify the verifier configuration to include a file exclusion pattern. For example, if using a glob-based exclusion:

```javascript
// In builderos/config/oil-verifier.js or similar
module.exports = {
  // ... existing configuration ...
  ignore: [
    '**/*.md', // Exclude all markdown files from syntax checks
    // ... other existing ignore patterns ...
  ],
  // ...
};
```

Or, if the verifier is invoked via a script, modify the script to pass an exclusion argument:

```bash
# In builderos/scripts/run-oil-verifier.js or similar build script
node ./node_modules/.bin/oil-verifier --ignore "**/*.md" --files "src/**/*.js"
```
*(Note: The exact syntax depends on the specific verifier tool used by BuilderOS. This is a conceptual example.)*

### 4. Verifier/Runtime Checks

1.  **Successful Document Creation:** Verify that `docs/projects/builderos-remediation/command-center-v2-blueprint-proof-g24-100.md` is created and contains the expected content.
2.  **OIL Verifier Pass:** Execute the BuilderOS build loop, specifically the OIL verifier step. Confirm that the `ERR_UNKNOWN_FILE_EXTENSION` for `.md` files no longer occurs.
3.  **Code Integrity:** Ensure that existing JavaScript files within the BuilderOS codebase continue to be correctly verified for syntax and other configured checks.

### 5. Stop Conditions if Runtime Truth Disagrees

*   **Persistence of Error:** If `ERR_UNKNOWN_FILE_EXTENSION` for `.md` files continues to appear, the verifier configuration change was not correctly applied or is being overridden.
*   **Over-Exclusion:** If the verifier begins to ignore valid JavaScript source files, the exclusion pattern is too broad or incorrectly implemented.
*   **New Verifier Errors:** If a different error related to `.md` files emerges (e.g., a parsing error instead of an unknown extension error), it indicates the verifier is still attempting to process the file, but with a different internal mechanism, requiring further investigation into its internal file type handling.