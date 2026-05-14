## Dashboard Layout Utilities Integration

This document outlines the integration of `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. These utilities provide deterministic UI state management for theme resolution, widget count clamping, and dashboard density calculation.

**ASSUMPTIONS:**
*   The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file is missing, so this documentation is generated from scratch.
*   No mockup PNG for density study was provided, so visual references are omitted.
*   The `hasPinnedRail` parameter for `pickDashboardDensity` will be determined by checking for a class on the `body` element (e.g., `body.has-ai-rail`), which would be set by the AI rail component when it's active.
*   The `dashboard-layout-utils.mjs` file will be placed in a location accessible from `public/overlay/lifeos-dashboard.html`, such as `/shared/dashboard-layout-utils.mjs`.

### 1. File Location and Import

The utility functions should be made available to the dashboard's client-side script.

**Suggested File Path:** `/shared/dashboard-layout-utils.mjs`

**Integration:**
Add a `<script type="module">` import statement within the `<head>` or at the end of `<body>` in `public/overlay/lifeos-dashboard.html`, before the main module script.

```html
<!-- In public/overlay/lifeos-dashboard.html -->
<script type="module" src="/shared/dashboard-layout-utils.mjs"></script>
<script type="module">
  import { clampMobileWidgetCount, resolveThemeMode, pickDashboardDensity } from '/shared/dashboard-layout-utils.mjs';
  // ... existing module script content
</script>
```

### 2. `resolveThemeMode` Integration

This function normalizes theme input to "light", "dark", or "system". It's primarily useful when reading theme preferences from external sources (e.g., `localStorage`, user settings API) to ensure a valid theme is always applied.

**Client-Side Boundary:** Purely client-side.

**DOM Hook Suggestions:**

*   **Initial Load:** When `document.addEventListener('DOMContentLoaded')` fires, use `resolveThemeMode` to sanitize the `lifeos_theme` value retrieved from `localStorage` before applying it.

    ```javascript
    // Inside the <script type="module"> block, within DOMContentLoaded listener
    document.addEventListener('DOMContentLoaded', () => {
      // ... existing loads
      const savedTheme = localStorage.getItem('lifeos_theme');
      const resolvedTheme = resolveThemeMode(savedTheme || 'system'); // Default to 'system' or 'dark'
      document.documentElement.dataset.theme = resolvedTheme;
      localStorage.setItem('lifeos_theme', resolvedTheme); // Ensure valid value is stored
      // ... update theme-color-meta and btn-theme text based on resolvedTheme
    });
    ```

*   **`toggleTheme()` function:** While `toggleTheme` currently flips between 'light' and 'dark', `resolveThemeMode` could be used if the function were to accept an arbitrary input (e.g., from a settings panel). For the current binary toggle, it's less critical but ensures robustness.

### 3. `clampMobileWidgetCount` Integration

This function ensures the number of widgets displayed on mobile devices stays within a reasonable range (1-6). It's intended for dynamic widget rendering logic.

**Client-Side Boundary:** Purely client-side.

**DOM Hook Suggestions (Future AI Rail / Dynamic Widget Rendering):**

*   **Dynamic Widget Loop:** When the AI rail or a dynamic widget manager determines which widgets to render, especially on smaller viewports, `clampMobileWidgetCount` would be used to limit the number of widgets.

    ```javascript
    // Example (conceptual, for a future dynamic widget renderer)
    function renderDynamicWidgets(availableWidgets, viewportWidth) {
      let desiredCount = availableWidgets.length; // Or derived from AI
      if (viewportWidth < 768) { // Example mobile breakpoint
        desiredCount = clampMobileWidgetCount(desiredCount);
      }
      // Loop and render 'desiredCount' widgets into a container element
      // e.g., document.getElementById('dynamic-widgets-container').innerHTML = ...
    }
    ```

*   **No direct integration into current `lifeos-dashboard.html` is required** as it uses static widget placeholders. This function will become relevant when the dashboard supports dynamic widget loading and arrangement.

### 4. `pickDashboardDensity` Integration

This function determines the optimal dashboard density ("compact", "balanced", "airy") based on viewport width, widget count, and the presence of a pinned AI rail. The result should be applied as a class to a root element (e.g., `<body>`) to enable CSS-driven layout adjustments.

**Client-Side Boundary:** Purely client-side.

**DOM Hook Suggestions:**

*   **Root Element Class:** Apply the determined density as a class to the `<body>` element. This allows CSS to react to the density.

    ```html
    <!-- Example CSS (in lifeos-dashboard-tokens.css or inline <style>) -->
    body.compact .two-col { gap: 8px; }
    body.airy .two-col { gap: 40px; }
    /* Define other density-specific styles */
    ```

*   **`applyDashboardDensity()` Function:** Create a function to encapsulate the logic, called on initial load and window resize.

    ```javascript
    // Inside the <script type="module"> block
    function applyDashboardDensity() {
      const viewportWidth = window.innerWidth;
      const widgetCount = document.querySelectorAll('.dashboard-widget').length;
      // Assume 'has-ai-rail' class is added to body when AI rail is pinned/active
      const hasPinnedRail = document.body.classList.contains('has-ai-rail');

      const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });

      // Remove existing density classes and add the new one
      document.body.classList.remove('compact', 'balanced', 'airy');
      document.body.classList.add(density);
    }

    // Initial application on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', applyDashboardDensity);

    // Re-apply on window resize
    window.addEventListener('resize', applyDashboardDensity);
    ```

This integration provides the foundation for a responsive and adaptive dashboard layout, preparing for future dynamic content and AI rail interactions.