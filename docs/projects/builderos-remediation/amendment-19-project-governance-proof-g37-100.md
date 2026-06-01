Proof-Closing Blueprint Note: Amendment 19 Project Governance - G37-100
This note outlines the next smallest build slice to advance the proof and implementation of Amendment 19 Project Governance within BuilderOS. The focus for this slice is to establish the foundational capability to locate and parse the Amendment 19 blueprint itself.
1.  Exact missing implementation or proof gap:
    The BuilderOS system currently lacks a verified mechanism to programmatically locate and load the `AMENDMENT_19_PROJECT_GOVERNANCE.md` blueprint file from its designated `docs/projects/` path. Before any governance rules can be applied or enforced, their source definition must be reliably accessible.
2.  Smallest safe build slice to close it:
    Implement a utility function within BuilderOS's internal tooling to resolve a blueprint's file path given its name, and then read its content. This function should be capable of handling standard markdown blueprint files.
3.  Exact safe-scope files to touch first:
-   `src/builder-os/utils/blueprint-loader.js` (new file)
-   `src/builder-os/utils/index.js` (export `blueprint-loader`)
-   `tests/builder-os/utils/blueprint-loader.test.js` (new file)
4.  Verifier/runtime checks:
-   Unit Test: `blueprint-loader.test.js` should contain tests that:
-   Verify the function can correctly resolve the path for `AMENDMENT_19_PROJECT_GOVERNANCE.md`.
-   Verify the function can read the content of a dummy blueprint file (e.g., a test fixture).
-   Verify errHdl for non-existent blueprint files.
-   Integration Check (Manual/CLI): A temporary BuilderOS CLI command or script could be used to invoke the `blueprint-loader` with `AMENDMENT_19_PROJECT_GOVERNANCE.md` and print its content, confirming successful retrieval.
5.  Stop conditions if runtime truth disagrees:
-   If `blueprint-loader.js` fails to resolve the correct path for `AMENDMENT_19_PROJECT_GOVERNANCE.md` (e.g., due to incorrect base path assumptions or file system access issues).
-   If `blueprint-loader.js` fails to read the content of an existing blueprint file, indicating file I/O problems.
-   If the unit