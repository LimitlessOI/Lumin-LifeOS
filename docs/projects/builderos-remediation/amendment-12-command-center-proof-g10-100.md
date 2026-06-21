<!-- SYNOPSIS: Amendment 12 Command Center Proof - G10-100 Remediation -->

# Amendment 12 Command Center Proof - G10-100 Remediation

## Blueprint Note: OIL Verifier Misconfiguration for Documentation Files

This note addresses the OIL verifier rejection related to `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".md"`. The verifier is attempting to parse documentation markdown files as Node.js ESM modules, which is an incorrect operational mode for `.md` files. The issue is not with the markdown file's content or syntax, but with the verifier's scope or invocation.

### 1. Exact Missing Implementation or Proof Gap

The current BuilderOS verifier pipeline, specifically the OIL verifier, is configured or invoked in a manner that includes non-executable documentation files (e.g., `.md` files) in its JavaScript module syntax check scope. This leads to `ERR_UNKNOWN_FILE_EXTENSION` when Node.js attempts to load a `.md` file as a module. The proof gap is the lack of a clear separation between documentation assets and executable code assets within the verifier's input set.

### 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves adjusting the BuilderOS verifier configuration or invocation script to explicitly exclude `.md` files (and potentially other non-code documentation formats) from the set of files passed to the Node.js module syntax checker. This ensures the verifier operates only on intended code artifacts.

### 3. Exact Safe-Scope Files to Touch First

The specific files to touch will depend on the BuilderOS's internal verifier orchestration. Based on common patterns, the following files or configuration areas are the most likely candidates:

*   `builderos/config/oil-verifier.json` (or similar configuration file defining verifier scope)
*   `builderos/scripts/run-oil-verifier.js` (or similar script orchestrating the verifier execution)
*   `package.json` (if the verifier is invoked via a `scripts` entry with a glob pattern)

**Proposed Action:**
Modify the relevant configuration or script to add an exclusion pattern for `**/*.md` files (and potentially `**/*.txt`, `**/*.yaml`, etc., as needed) from the verifier's input glob or file list.

Example (conceptual, assuming a glob pattern in a config):
```json
// builderos/config/oil-verifier.json (conceptual)
{
  "include": ["src/**/*.js", "src/**/*.ts"],
  "exclude": ["docs/**/*.md", "docs/**/*.txt"] // Add this exclusion
}
```

Example (conceptual, assuming a script argument):
```javascript
// builderos/scripts/run-oil-verifier.js (conceptual)
const verifierArgs = [
  '--files', 'src/**/*.js', 'src/**/*.ts',
  '--exclude-files', 'docs/**/*.md' // Add this exclusion
];
// ... execute verifier with verifierArgs
```

### 4. Verifier/Runtime Checks

1.  **Local Test:** Run the BuilderOS build loop locally after applying the configuration change.
2.  **OIL Verifier Pass:** Confirm that the OIL verifier now completes successfully without the `ERR_UNKNOWN_FILE_EXTENSION` error for `.md` files.
3.  **Code Verification Integrity:** Ensure that actual JavaScript/TypeScript files within the `src/` directories are still correctly verified for syntax and other defined checks.
4.  **No Regression:** Verify that no new build failures or unexpected behavior are introduced in other parts of the BuilderOS pipeline.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `ERR_UNKNOWN_FILE_EXTENSION` error persists for `.md` files, indicating the exclusion pattern was not correctly applied or the wrong configuration file was modified.
*   If the verifier fails to process valid JavaScript/TypeScript files, suggesting the exclusion pattern was too broad or incorrectly implemented.
*   If the BuilderOS loop enters an unstable state or introduces new, unrelated failures, indicating a broader impact from the configuration change.
*   If the verifier reports new, unexpected syntax errors in previously valid code, suggesting a change in the verifier's operational mode beyond just file exclusion.

In any of these cases, revert the change and investigate the verifier's invocation mechanism more deeply within the BuilderOS architecture.