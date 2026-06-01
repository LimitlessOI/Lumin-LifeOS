# Amendment 14 White-Label Proof: G12-100 - Dynamic Logo Display

This document outlines the next smallest build slice for proving the white-label dynamic logo display as specified in `AMENDMENT_14_WHITE_LABEL.md`.

---

### 1. Exact Missing Implementation or Proof Gap

The blueprint specifies the need for dynamic white-label branding, specifically the ability to display a client-specific logo. The current gap is the implementation of a mechanism to conditionally load and display a white-label logo URL within a core UI component, falling back to a default logo if no white-label configuration is present. This proof focuses on the client-side rendering aspect, assuming a configuration source is available.

### 2. Smallest Safe Build Slice to Close It

Implement a `getWhiteLabelLogoUrl()` utility function that reads a white-label logo URL from a designated configuration source (e.g., an environment variable or a simple static config object). Integrate this utility into an existing branding component (e.g., `Logo.js`) to dynamically set the `src` attribute of an `<img>` tag.

### 3. Exact Safe-Scope Files to Touch First

*   `src/config/whiteLabelConfig.js`: New file to centralize white-label configuration access.
*   `src/components/branding/Logo.js`: Existing component to be modified for dynamic logo display.

### 4. Verifier/Runtime Checks

1.  **White-Label Logo Present:**
    *   **Setup:** Set `process.env.WHITE_LABEL_LOGO_URL` to a valid test image URL (e.g., `https://example.com/client-logo.png`).
    *   **Check:** Render the `Logo` component. Inspect the DOM to confirm the `<img>` element's `src` attribute matches `https://example.com/client-logo.png`.
2.  **Default Logo Fallback:**
    *   **Setup:** Ensure `process.env.WHITE_LABEL_LOGO_URL` is unset or empty.
    *   **Check:** Render the `Logo` component. Inspect the DOM to confirm the `<img>` element's `src` attribute matches the expected default logo URL (e.g., `/assets/default-logo.svg`).

### 5. Stop Conditions if Runtime Truth Disagrees

*   If `src/components/branding/Logo.js` does not exist or has a fundamentally different structure that prevents direct `src` attribute modification without significant refactoring.
*   If the assumed configuration mechanism (e.g., `process.env`) is not the intended source for white-label branding, and a more complex data fetching strategy (e.g., API call, database lookup) is required, which would exceed the scope of this minimal build slice.
*   If the `Logo` component is not directly responsible for rendering the primary application logo, and another component needs to be targeted.