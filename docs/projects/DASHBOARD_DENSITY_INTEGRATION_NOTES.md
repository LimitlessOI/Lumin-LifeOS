Contradiction: The task explicitly requests Markdown documentation, but a general "HTML FULL FILE — STRICT OUTPUT CONTRACT" is present, which would apply if the output were HTML code. I will prioritize the explicit task and specification for Markdown documentation.

## Dashboard Layout Utilities Integration

This document outlines the integration strategy for the `dashboard-layout-utils.mjs` functions into the dashboard shell, focusing on client-side application without implementing the full AI rail yet.

**Note**: The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file was not found, so references to a mockup PNG for density study are omitted.

### 1. `clampMobileWidgetCount(count)`

**Purpose**: To ensure the number of widgets displayed on mobile devices remains within a sensible range (1-6).

**Integration**: This utility is intended for client-side use when dynamically rendering a list of dashboard widgets. Before iterating to create widget DOM elements, the raw count of available widgets should be passed through this function.

**DOM Hook Suggestions**:
*   **Client-side**: Within the JavaScript responsible for fetching and rendering dashboard widgets (e.g., in `loadMITs()`, `loadCal()`, `loadGoals()`, `loadScores()` or a higher-level widget orchestration function), apply `clampMobileWidgetCount` to the total number of widgets before deciding how many to display.
    ```javascript
    import { clampMobileWidgetCount } from './scripts/builder-smoke/dashboard-layout-utils.mjs';

    // ... inside a widget rendering function
    const rawWidgetCount = d.widgets.length; // Example: from an API response
    const displayCount = clampMobileWidgetCount(rawWidgetCount);

    // Then, loop 'displayCount' times to render widgets
    ```

### 2. `resolveThemeMode(value)`

**Purpose**: To normalize a given theme preference string ('light', 'dark', 'system') into a consistent value.

**Integration**: This function can be used both during server-side rendering (if theme preference is known) and client-side to ensure theme settings are valid before application. The existing `toggleTheme()` function in `lifeos-dashboard.html` already handles theme switching, but `resolveThemeMode` can enhance its robustness by validating input.

**DOM Hook Suggestions**:
*   **SSR Boundary (Optional)**: If user theme preferences are available server-side, the initial `<html>` tag could be rendered with `data-theme="[resolvedTheme]"` and the `<meta name="theme-color">` tag could be set accordingly, preventing a flash of unstyled content.
*   **Client-side (Initial Load)**: When `lifeos-theme.js` initializes or when a theme preference is loaded from `localStorage`, `resolveThemeMode` should be used to validate the stored value before setting `document.documentElement.dataset.theme`.
    ```javascript
    import { resolveThemeMode } from './scripts/builder-smoke/dashboard-layout-utils.mjs';

    // ... inside lifeos-theme.js or dashboard init script
    const storedTheme = localStorage.getItem('lifeos_theme_preference');
    const initialTheme = resolveThemeMode(storedTheme || 'system'); // Default to system
    if (window.__lifeosTheme) window.__lifeosTheme.set(initialTheme);
    else document.documentElement.dataset.theme = initialTheme;
    ```
*   **Client-side (Theme Toggle)**: The `toggleTheme()` function could use `resolveThemeMode` to ensure the `next` theme value is always one of the expected outputs.

### 3. `pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail })`

**Purpose**: To determine the optimal dashboard density ('compact', 'balanced', 'airy') based on current viewport width, the number of active widgets, and the presence of a pinned navigation rail.

**Integration**: This function is critical for responsive layout adjustments and should be executed client-side on page load and whenever the viewport resizes. The returned density string should be applied as a class to a top-level container (e.g., `<body>` or `.page`) to drive CSS-based layout changes.

**DOM Hook Suggestions**:
*   **Client-side (Initial Load & Resize)**:
    1.  **Import**: Import `pickDashboardDensity` into the main dashboard script (e.g., within the `<script type="module">` block in `lifeos-dashboard.html`).
    2.  **Data Collection**:
        *   `viewportWidth`: Obtain from `window.innerWidth`.
        *   `widgetCount`: Dynamically count the number of visible `.card` elements or active widgets.
        *   `hasPinnedRail`: Determine by checking for a specific class on `body` (e.g., `body.has-pinned-rail`) or the presence/visibility of a dedicated rail element.
    3.  **Apply Density Class**: Call `pickDashboardDensity` with the collected data and apply the result as a class to the `<body>` or `.page` element.
    ```javascript
    import { pickDashboardDensity } from './scripts/builder-smoke/dashboard-layout-utils.mjs';

    function applyDashboardDensity() {
        const viewportWidth = window.innerWidth;
        const widgetCount = document.querySelectorAll('.card:not(.empty-state)').length; // Count actual widgets
        const hasPinnedRail = document.body.classList.contains('has-pinned-rail'); // Example check for a rail

        const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });
        // Remove any existing density class before adding the new one
        document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('density-')).join(' ');
        document.body.classList.add(`density-${density}`);
    }

    // Initial application on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', applyDashboardDensity);
    // Re-apply on window resize
    window.addEventListener('resize', applyDashboardDensity);
    ```
*   **CSS Integration**: Define CSS rules that respond to the `density-compact`, `density-balanced`, and `density-airy` classes on the `body` or `.page` element to adjust `gap` values, `padding`, `font-sizes`, and other layout properties.
    ```css
    /* Example CSS in public/overlay/lifeos-dashboard.html <style> block */
    body.density-compact .page {
        padding: 16px 8px;
    }
    body.density-compact .two-col {
        gap: 8px;
    }
    body.density-airy .page {
        max-width: 1024px; /* Wider for airy */
        padding: 32px 24px;
    }
    /* ... other density-specific styles */
    ```