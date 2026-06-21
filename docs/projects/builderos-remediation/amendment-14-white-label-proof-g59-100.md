<!-- SYNOPSIS: Documentation — Amendment 14 White Label Proof G59 100. -->

Amendment 14: White Label Proof - G59-100: Dynamic Primary Color Application

This blueprint note closes the proof gap for `G59-100`, focusing on the dynamic application of the white-label `primaryColor` to the application's styling context. This is a foundational step for ensuring white-label branding is correctly reflected across the LifeOS platform.

---
### Proof-Closing Blueprint Note: Dynamic Primary Color Application

**1. Exact Missing Implementation or Proof Gap:**
The mechanism to dynamically retrieve the `primaryColor` from the white-label configuration and apply it as a global CSS custom property (variable) to the application's root element. This ensures all components can consume the white-label primary color consistently.

**2. Smallest Safe Build Slice to Close It:**
Implement a utility to fetch the `primaryColor` from the white-label configuration. Then, at the application's entry point, read this color and set it as a CSS custom property, e.g., `--wl-primary-color`, on the `document.documentElement` (the `<html>` element). This allows all subsequent CSS to reference this variable for white-label theming.

**3. Exact Safe-Scope Files to Touch First:**
*   `src/config/whiteLabel.js`: (Create if not exists, or modify) Export a function `getPrimaryColor()` that returns the configured white-label primary color. This function should safely retrieve the color from an environment variable (e.g., `process.env.BUILDEROS_WL_PRIMARY_COLOR`) or a dedicated configuration object.
*   `src/index.js`: (Modify) Import `getPrimaryColor()` and, before rendering the main application component, call `document.documentElement.style.setProperty('--wl-primary-color', getPrimaryColor());`.
*   `src/styles/global.css`: (Modify) Update existing styles or add new ones to utilize `var(--wl-primary-color)` where the primary color is needed (e.g., `color: var(--wl-primary-color); background-color: var(--wl-primary-color);`).

**4. Verifier/Runtime Checks:**
*   **Verifier Check (Automated):**
    *   Verify that `src/config/whiteLabel.js` exports `getPrimaryColor()` and it returns a valid color string (e.g., hex, rgb, hsl).
    *   Verify that `src/index.js` contains a call to `document.documentElement.style.setProperty('--wl-primary-color', ...)` using the result of `getPrimaryColor()`.
    *   Run a headless browser test (e.g., Playwright, Puppeteer) to assert that `document.documentElement.style.getPropertyValue('--wl-primary-color')` matches the expected configured color.
*   **Runtime Check (Manual/Visual):**
    *   Load the application in a browser.
    *   Inspect the `<html>` element in developer tools to confirm that `--wl-primary-color` is set and its value matches the configured white-label primary color.
    *   Visually confirm that UI elements (buttons, links, active states) that are expected to use the primary color are rendered with the correct white-label color.

**5. Stop Conditions if Runtime Truth Disagrees:**
*   If `getPrimaryColor()` returns an undefined, null, or invalid color value.
*   If `document.documentElement.style.getPropertyValue('--wl-primary-color')` does not match the value returned by `