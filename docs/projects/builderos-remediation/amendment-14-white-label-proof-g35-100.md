# Amendment 14 White-Label Proof: G35-100 Remediation

This document outlines the remediation for the G35-100 white-label proof, focusing on the correct application of project-specific white-label assets within BuilderOS generated outputs.

## 1. Exact Missing Implementation or Proof Gap

The BuilderOS artifact generation for project G35-100 fails to correctly apply the `whiteLabel.logoUrl` specified in the project's `builderConfig.json`. The generated artifact's header consistently displays a default BuilderOS logo instead of the configured project-specific one, indicating a gap in configuration propagation to the rendering context.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves modifying the artifact generation service to explicitly retrieve and inject the `project.builderConfig.whiteLabel.logoUrl` into the data context provided to the header template. This ensures the template has access to the correct asset URL for rendering.

## 3. Exact Safe-Scope Files to Touch First

*   `services/builder-artifact-generator/src/artifactGenerator.js`: Update the `generateArtifact` function to read `project.builderConfig.whiteLabel.logoUrl` and pass it as a variable (e.g., `customLogoUrl`) to the template rendering engine.
*   `services/builder-artifact-generator/src/templates/header.hbs`: Modify the Handlebars template to conditionally render `customLogoUrl` if provided, falling back to a default if not.

## 4. Verifier/Runtime Checks

1.  **Unit Test:** Add a test case to `services/builder-artifact-generator/test/artifactGenerator.test.js` that simulates a project with `whiteLabel.logoUrl` and asserts the presence of this URL in the generated artifact's header content.
2.  **Integration Test (BuilderOS Staging):**
    *   Create a new BuilderOS project (`g35-100-test`) in staging.
    *   Configure its `builderConfig.json` with a unique `whiteLabel.logoUrl`.
    *   Trigger an artifact build for `g35-100-test`.
    *   Visually inspect the generated artifact to confirm the custom logo is displayed in the header.
    *   Programmatically verify the artifact's HTML content contains the `customLogoUrl`.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the generated artifact for `g35-100-test` still shows the default BuilderOS logo.
*   If the `artifactGenerator.js` encounters errors related to accessing `project.builderConfig` or `whiteLabel.logoUrl`.
*   If the change inadvertently affects white-labeling for other BuilderOS projects or introduces regressions in artifact generation.
*   If the `customLogoUrl` is rendered in incorrect locations or with improper styling.