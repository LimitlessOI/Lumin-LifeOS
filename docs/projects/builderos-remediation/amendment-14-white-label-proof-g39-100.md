The instruction to write a markdown file is contradictory with the verifier's attempt to execute it as a Node.js module.
# Amendment 14 White-Label Proof - G39-100 Remediation

This document serves as the proof-closing blueprint note for the remediation of the OIL verifier rejection related to Amendment 14 White-Label implementation. The previous rejection was due to the verifier attempting to execute a `.md` file as a Node.js module, indicating a verifier configuration mismatch rather than a syntax error in the markdown content itself.

The purpose of this proof is to confirm the correct application and runtime verification of white-label configurations as per Amendment 14.

## Proof-Closing Blueprint Note

### 1. Exact Missing Implementation or Proof Gap

The current gap is the lack of a dedicated, automated runtime verification step within BuilderOS to confirm that the white-label configuration specified by Amendment 14 is correctly loaded and applied to a target project's build output or runtime environment. Specifically, we need to verify that the `project.whiteLabelConfig` object is correctly propagated and accessible within the BuilderOS build context for a given `projectId`.

### 2. Smallest Safe Build Slice to Close It

Introduce a new BuilderOS verification step that inspects the `project` object within the build context for the presence and correctness of the `whiteLabelConfig` property. This step should run early in the build pipeline, after project configuration loading but before any UI rendering or asset generation that would consume this configuration.

### 3. Exact Safe-Scope Files to Touch First

*   `src/builder-os/pipeline/verifyProjectConfig.js`: Create or modify this file to add a new verification function.
*   `src/builder-os/pipeline/index.js`: Update the main pipeline definition to include the new `verifyProjectConfig` step.
*   `src/builder-os/types/project.d.ts`: Ensure `whiteLabelConfig` is correctly typed on the `Project` interface (if not already present from Amendment 14 implementation).

### 4. Verifier/Runtime Checks

*   **Unit Test:** Add a unit test for `verifyProjectConfig.js` that mocks a `Project` object with and without `whiteLabelConfig` and asserts the function's behavior (e.g., throws an error if missing when required, passes if present and valid).
*   **Integration Test (BuilderOS):** Create an integration test within BuilderOS that simulates a build for a project configured with Amendment 14 white-labeling. The test should assert that the `verifyProjectConfig` step executes successfully and reports the correct white-label configuration.
*   **Runtime Log Check:** During a BuilderOS build, observe logs for the `verifyProjectConfig` step. It should log the detected `whiteLabelConfig` for projects where it's expected.
*   **Manual Inspection (if applicable):** For a specific test project, after a BuilderOS build, inspect the generated build artifacts (e.g., `config.json` or a specific JS bundle) to confirm the white-label values are present and correct.

### 5. Stop Conditions if Runtime Truth Disagrees

*   If the `verifyProjectConfig` step fails for a project where `whiteLabelConfig` is expected, stop the build and report a configuration error.
*   If the `whiteLabelConfig` values found in runtime logs or generated artifacts do not match the expected values from the project's configuration, stop the build and flag a data propagation issue.
*   If the `project.whiteLabelConfig` property is unexpectedly missing or malformed during the `verifyProjectConfig` step, halt the build.
*   If the integration tests fail, indicating the new verification step is not correctly integrated or is not passing for valid configurations, block further deployment.