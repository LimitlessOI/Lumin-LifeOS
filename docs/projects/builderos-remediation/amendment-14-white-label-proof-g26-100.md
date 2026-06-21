<!-- SYNOPSIS: Amendment 14 White Label Proof: G26-100 Remediation -->

The source blueprint `docs/projects/AMENDMENT_14_WHITE_LABEL.md` was not provided, leading to inferred content.
# Amendment 14 White Label Proof: G26-100 Remediation

This document outlines the remediation plan for proof point G26-100, identified as a gap in the white-label implementation verification for Amendment 14.

## 1. Exact Missing Implementation or Proof Gap

The current white-label proof for Amendment 14 lacks explicit verification that the `custom_logo_url` and `primary_brand_color` are correctly applied and rendered within the BuilderOS login and dashboard headers for a white-labeled client. The existing proof only covers generic UI elements, not the specific branding overrides introduced or impacted by Amendment 14's expanded white-label scope.

## 2. Smallest Safe Build Slice to Close It

The smallest safe build slice involves:
*   Adding new assertion steps to the existing BuilderOS white-label test suite.
*   Ensuring the BuilderOS application context correctly provides white-label configuration during testing.
*   Asserting the presence and correctness of the `custom_logo_url` (e.g., checking `src` attribute of an `<img>` tag) and `primary_brand_color` (e.g., checking `style` or computed `background-color` of relevant elements) within the rendered login and dashboard headers.

## 3. Exact Safe-Scope Files to Touch First

*   `builderos/tests/e2e/white-label/amendment14.spec.js` (or similar existing E2E test file for Amendment 14 white-labeling)
*   `builderos/src/config/whiteLabelConfig.js` (to ensure the configuration structure supports the new elements)
*   `builderos/src/ui/components/Header.js` (to ensure the component correctly consumes white-label props/context for logo and color)
*   `builderos/src/ui/pages/Login.js` (to ensure the login page correctly applies white-label branding)

## 4. Verifier/Runtime Checks

*   **E2E Tests:**
    *   Run `npm run test:e2e -- builderos/tests/e2e/white-label/amendment14.spec.js`
    *   Verify the new test cases `should display custom logo in login header for white-labeled client` and `should apply primary brand color to dashboard header for white-labeled client` pass.
*   **Manual BuilderOS UI Verification:**
    *   Provision a test client with white-label configuration enabled for Amendment 14 features, including `custom_logo_url` and `primary_brand_color`.
    *   Access the BuilderOS login page and visually confirm the custom logo is displayed.
    *   Log in and navigate to the BuilderOS dashboard; visually confirm the primary brand color is applied to the header.

## 5. Stop Conditions if Runtime Truth Disagrees

*   If the new E2E test cases fail, indicating the white-label elements are not correctly applied or detected.
*   If manual BuilderOS UI verification shows incorrect branding, missing elements, or default branding where white-label should apply.
*   If applying the white-label configuration for Amendment 14 causes regressions in other BuilderOS white-label features (e.g., other components lose their white-label styling).
*   If the changes introduce performance degradation or unexpected side effects in the BuilderOS UI (e.g., layout shifts, console errors).

Further investigation into the BuilderOS UI component's white-label integration or the white-label configuration mechanism will be required.