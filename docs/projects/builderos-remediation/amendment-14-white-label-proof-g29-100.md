ASSUMPTIONS: The content of `docs/projects/AMENDMENT_14_WHITE_LABEL.md` is assumed to define requirements for white-labeling BuilderOS, specifically including a `headerLogoUrl` configuration. The "g29-100" identifier is assumed to refer to a specific issue with the BuilderOS header logo not correctly applying this white-label configuration.
# AMENDMENT_14_WHITE_LABEL Proof: G29-100 Remediation

This document outlines the remediation plan and proof for gap G29-100 identified during the OIL verifier rejection for AMENDMENT_14_WHITE_LABEL.

## 1. Exact Missing Implementation or Proof Gap

The current BuilderOS implementation for white-labeling the header logo (G29-100) does not correctly resolve and render the configured white-label asset. Specifically, the component responsible for displaying the header logo is either:
a. Not correctly retrieving the `whiteLabelConfig.headerLogoUrl` from the BuilderOS configuration service.
b. Failing to correctly pass this URL to the rendering component.
c. The rendering component itself has a fallback mechanism that incorrectly overrides the provided white-label URL.
The proof gap is the lack of a verified mechanism ensuring the configured `headerLogoUrl` is consistently applied and rendered in the BuilderOS header.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Verifying the `whiteLabelConfig` object is correctly loaded and accessible within the BuilderOS frontend application.
*   Tracing the `headerLogoUrl` property from the configuration service to the specific UI component responsible for rendering the BuilderOS header logo.
*   Ensuring the UI component prioritizes the `whiteLabelConfig.headerLogoUrl` over any default or hardcoded values.

## 3. Exact Safe-Scope Files to Touch First

Based on common BuilderOS frontend architecture patterns, the following files are likely candidates for initial investigation and modification:

*   `apps/builderos/src/config/whiteLabel.js`: (Or similar) Configuration loading and parsing for white-label settings.
*   `apps/builderos/src/components/Header/BuilderOSHeader.jsx`: (Or similar) The React/Vue/Angular component responsible for rendering the BuilderOS header.
*   `apps/builderos/src/services/configService.js`: (Or similar) Service responsible for providing application configuration to components.
*   `apps/builderos/src/store/modules/whiteLabel.js`: (Or similar) If using a state management solution (e.g., Vuex, Redux) to store white-label settings.

The primary focus will be on `apps/builderos/src/components/Header/BuilderOSHeader.jsx` and its data source for the logo URL.

## 4. Verifier/Runtime Checks

To verify the fix:
*   **Unit Tests:** Add or update unit tests for `BuilderOSHeader.jsx` to mock `whiteLabelConfig.headerLogoUrl` and assert that the correct URL is used for the `<img>` tag's `src` attribute.
*   **Integration Tests:** Implement an integration test that loads BuilderOS with a specific `whiteLabelConfig` (including `headerLogoUrl`) and asserts the rendered header logo's `src` attribute matches the configured URL.
*   **Manual UI Verification:**
    1.  Deploy BuilderOS with a known `whiteLabelConfig` that specifies a unique `headerLogoUrl`.
    2.  Navigate to any BuilderOS page.
    3.  Visually inspect the header logo to ensure it displays the configured white-label asset.
    4.  Inspect the DOM to confirm the `<img>` tag's `src` attribute points to the correct `headerLogoUrl`.

## 5. Stop Conditions if Runtime Truth Disagrees

If runtime checks (especially manual UI verification or integration tests) reveal that the white-label header logo is still not correctly displayed or the `src` attribute does not match the configured `headerLogoUrl`:
*   **Stop Condition 1:** The `whiteLabelConfig` object is not correctly loaded or accessible within the BuilderOS application context. Re-evaluate `configService.js` and `whiteLabel.js`.
*   **Stop Condition 2:** The `headerLogoUrl` property is being overridden or ignored by a higher-priority default within the `BuilderOSHeader.jsx` component or its parent. Investigate component rendering logic and prop drilling.
*   **Stop Condition 3:** The asset itself is not reachable or correctly served from the specified `headerLogoUrl`. Verify asset deployment and network accessibility.
*   **Stop Condition 4:** A caching issue is preventing the updated asset or configuration from being loaded. Clear browser cache and re-test.

This remediation focuses on ensuring the `headerLogoUrl` from `AMENDMENT_14_WHITE_LABEL` is correctly propagated and rendered in the BuilderOS header.