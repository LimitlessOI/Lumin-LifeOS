<!-- SYNOPSIS: Documentation — DASHBOARD DENSITY INTEGRATION NOTES. -->

**SPECIFICATION INCONSISTENCY**: `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` is referenced but not found in REPO FILE CONTENTS. This documentation will proceed without referencing its content.
---
### Dashboard Layout Utilities Integration

The `scripts/builder-smoke/dashboard-layout-utils.mjs` module provides functions to manage dashboard presentation. Integrating these into `public/overlay/lifeos-dashboard.html` involves client-side JavaScript to dynamically adjust the UI based on user preferences and viewport characteristics.

#### `clampMobileWidgetCount` Integration

This function (`clampMobileWidgetCount(count)`) ensures a widget count remains within a mobile-friendly range (1-6).

*   **Purpose**: To constrain the number of widgets displayed on smaller screens, preventing excessive scrolling or visual clutter.
*   **DOM Hook**: This function would be invoked client-side when dynamically rendering a list of widgets, particularly if the dashboard supports user customization or a variable number of active widgets. For example, if a user selects 10 widgets, this function would reduce the effective count to 6 on mobile.
*   **SSR/Client Boundary**: Exclusively client-side, as it depends on the current viewport and the dynamic state of widget selection.

#### `resolveThemeMode` Integration

The `resolveThemeMode(value)` function normalizes a theme preference string to 'light', 'dark', or 'system'.

*   **Purpose**: To standardize theme input, ensuring consistent application of visual modes.
*   **DOM Hook**:
    *   **Initial Load**: Integrate into the `DOMContentLoaded` listener within the existing `<script type="module">` block. Replace the current `localStorage.getItem('lifeos_theme')` logic with a call to `resolveThemeMode` to process the stored value before applying it to `document.documentElement.dataset.theme`.
    *   **Theme Toggle**: Within the `toggleTheme()` function, use `resolveThemeMode` to process the `next` theme value before setting it in `localStorage` and `document.documentElement.dataset.theme`.
*   **SSR/Client Boundary**: Primarily client-side, interacting with `localStorage` and DOM attributes. If user theme preferences were persisted server-side, `resolveThemeMode` could be used during SSR to set the initial `data-theme` attribute on the `<html>` tag.

#### `pickDashboardDensity` Integration

The `pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail })` function determines the overall visual density of the dashboard ('compact', 'airy', 'balanced') based on provided parameters.

*   **Purpose**: To dynamically adjust spacing, font sizes, and element layouts to optimize readability and information density across different screen sizes and user configurations.
*   **DOM Hook**:
    *   **Initial Load**: On `DOMContentLoaded`, calculate the initial density.
        *   `viewportWidth`: Obtain from `window.innerWidth`.
        *   `widgetCount`: Count the number of visible `.card` elements within the main `.page` container (e.g., `document.querySelectorAll('.page .card').length`).
        *   `hasPinnedRail`: Check the visibility or state of the `#lifeos-ai-rail-root` element (e.g., `document.getElementById('lifeos-ai-rail-root').classList.contains('pinned')`).
        *   Apply the resulting density class (e.g., `dashboard-density-compact`, `dashboard-density-airy`, `dashboard-density-balanced`) to the `<body>` or `.page` element.
    *   **Dynamic Adjustment**: Attach an event listener to `window.onresize` to recalculate and reapply the density class whenever the viewport changes.
*   **CSS Implications**: New CSS rules would be required in the `<style>` block of `lifeos-dashboard.html` (or a linked stylesheet) to define how elements like `.card`, `.page`, and their children adjust their padding, margins, and font sizes based on the applied density class. For example:
    ```css
    body.dashboard-density-compact .card {
      padding: 12px; /* Reduced padding */
      border-radius: var(--radius-md); /* Slightly smaller radius */
    }
    body.dashboard-density-airy .card {
      padding: 28px; /* Increased padding */
      border-radius: var(--radius-xl); /* Larger radius */
    }
    ```
*   **SSR/Client Boundary**: Primarily client-side due to its reliance on `window.innerWidth` and dynamic DOM state. An initial density could be inferred on the server if user preferences for density or typical device width are known, allowing the server to render the initial HTML with the appropriate density class.

---
**ASSUMPTIONS**:
- For `pickDashboardDensity`, `widgetCount` refers to the total number of `.card` elements present in the main content area of the dashboard.
- The "mockup PNG for density study" was not provided, so specific visual adjustments for 'compact', 'airy', and 'balanced' densities are illustrative CSS examples only.
- The AI rail's "pinned" state would be indicated by a class on `#lifeos-ai-rail-root` or a similar mechanism.