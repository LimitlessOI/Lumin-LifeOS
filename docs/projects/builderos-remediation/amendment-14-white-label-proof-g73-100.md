# Amendment 14 White Label Proof - G73-100 Remediation

This document outlines the next smallest build slice to address a specific proof gap identified in the BuilderOS white-label implementation, following the blueprint `docs/projects/AMENDMENT_14_WHITE_LABEL.md`.

---

## Proof-Closing Blueprint Note

**1. Exact Missing Implementation or Proof Gap:**
The BuilderOS UI currently lacks consistent application of the configured `primaryBrandColor` from the `whiteLabelConfig` to all interactive elements. Specifically, the active state indicator within the main `NavigationBar` component does not reliably reflect the designated `primaryBrandColor`, leading to a branding inconsistency. The gap is ensuring the `primaryBrandColor` is correctly consumed and applied by the `NavigationBar` for its active state styling.

**2. Smallest Safe Build Slice to Close It:**
Update the `NavigationBar` component to retrieve the `primaryBrandColor` from the `whiteLabelService` and apply it as a CSS variable or inline style to its active navigation item indicator. This ensures dynamic branding without altering core component logic beyond styling.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/builder-os/ui/components/NavigationBar/NavigationBar.js` (or `.jsx`/`.tsx`)
*   `src/builder-os/core/config/whiteLabelService.js` (to ensure `primaryBrandColor` is exposed)
*   `src/builder-os/ui/styles/variables.css` (if using CSS custom properties for theming)

**4. Verifier/Runtime Checks:**
1.  **Deployment:** Deploy the updated BuilderOS build slice to a dedicated staging environment.
2.  **Configuration:** Access the BuilderOS UI with a white-label configuration that explicitly defines a unique `primaryBrandColor` (e.g., `#FF00FF` for testing).
3.  **Navigation Test:** Navigate through various sections of the BuilderOS application, observing the `NavigationBar`.
4.  **Visual Verification:** Confirm that the active state indicator (e.g., underline, background highlight) for the currently selected navigation item consistently displays the configured `primaryBrandColor`. Use browser developer tools to inspect the computed style.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If the `NavigationBar`'s active state indicator does not render with the `primaryBrandColor` specified in the `whiteLabelConfig`.
*   If applying this change causes unintended styling regressions or visual anomalies in other BuilderOS UI components.
*   If the `whiteLabelService` fails to provide the `primaryBrandColor` or provides an incorrect value.

In any of these scenarios, halt the current build pass. Investigate the data flow from `whiteLabelService` to `NavigationBar`, the CSS application logic within `NavigationBar`, and potential cascading style conflicts.