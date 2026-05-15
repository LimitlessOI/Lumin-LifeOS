The `scripts/builder-smoke/dashboard-layout-utils.mjs` module provides client-side utilities for managing dashboard UI state. This document outlines how `clampMobileWidgetCount`, `resolveThemeMode`, and `pickDashboardDensity` should integrate into the `public/overlay/lifeos-dashboard.html` shell, focusing on DOM hooks and client-side execution. The full AI rail integration is out of scope for this document.

### `clampMobileWidgetCount` Integration

*   **Purpose**: To ensure the number of widgets displayed on mobile viewports remains within a sensible range (1-6).
*   **DOM Hook Suggestions**:
    *   This utility would be invoked client-side within a function responsible for rendering or dynamically adjusting the visibility of dashboard widgets, particularly when the viewport is narrow.
    *   For example, if a future AI-driven widget selection process proposes more than 6 widgets for a mobile view, `clampMobileWidgetCount` would reduce that number before rendering.
    *   It could be used in conjunction with `pickDashboardDensity` to inform how many widgets are visible when a "compact" density is applied.
*   **SSR/Client Boundary**: Exclusively a client-side utility, as it depends on dynamic viewport characteristics and client-side widget rendering.

### `resolveThemeMode` Integration

*   **Purpose**: To standardize and resolve theme mode strings (e.g., from `localStorage` or user preferences) to one of "light", "dark", or "system".
*   **DOM Hook Suggestions**:
    *   **Module Import**: The utility should be imported into the main `<script type="module">` block in `lifeos-dashboard.html`.
        ```javascript
        import { resolveThemeMode } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';
        // ... rest of the script
        ```
    *   **Initial Load**: In the `DOMContentLoaded` event listener within `lifeos-dashboard.html`, update the theme initialization logic to use `resolveThemeMode`.
        ```javascript
        document.addEventListener('DOMContentLoaded', () => {
            // ... existing loads
            const rawSavedTheme = localStorage.getItem('lifeos_theme');
            const resolvedTheme = resolveThemeMode(rawSavedTheme); // Use the utility
            document.documentElement.dataset.theme = resolvedTheme;
            // ... update theme-color-meta and btn-theme text based on resolvedTheme
        });
        ```
    *   **Theme Toggle**: Update the `toggleTheme()` function to use `resolveThemeMode` when determining the `next` theme state.
        ```javascript
        function toggleTheme() {
            const curr = document.documentElement.dataset.theme;
            const nextRaw = curr === 'light' ? 'dark' : 'light';
            const nextResolved = resolveThemeMode(nextRaw); // Use the utility
            document.documentElement.dataset.theme = nextResolved;
            localStorage.setItem('lifeos_theme', nextResolved);
            // ... update meta tag and button text
        }
        ```
*   **SSR/Client Boundary**: Primarily client-side, as theme preference is typically managed in the browser (localStorage) and applied dynamically.

### `pickDashboardDensity` Integration

*   **Purpose**: To dynamically apply a dashboard density (`"compact"`, `"balanced"`, `"airy"`) based on viewport width, active widget count, and the presence of a pinned AI rail.
*   **DOM Hook Suggestions**:
    *   **Module Import**: Import `pickDashboardDensity` into the main `<script type="module">` block in `lifeos-dashboard.html`.
        ```javascript
        import { pickDashboardDensity } from '/scripts/builder-smoke/dashboard-layout-utils.mjs';
        // ... rest of the script
        ```
    *   **Density Application Function**: Create a new client-side function, e.g., `updateDashboardDensity()`, to encapsulate the logic.
        ```javascript
        function updateDashboardDensity() {
            const viewportWidth = window.innerWidth;
            const widgetCount = document.querySelectorAll('.dashboard-widget').length;
            // Check if the AI rail root exists and has children (indicating it's "pinned" or active)
            const aiRailRoot = document.getElementById('lifeos-ai-rail-root');
            const hasPinnedRail = aiRailRoot && aiRailRoot.children.length > 0;

            const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });

            // Apply density as a data attribute to the body or .page element
            document.body.setAttribute('data-dashboard-density', density);
            // Alternatively, add/remove classes:
            // document.body.classList.remove('density-compact', 'density-balanced', 'density-airy');
            // document.body.classList.add(`density-${density}`);
        }
        ```
    *   **Event Listeners**:
        *   Call `updateDashboardDensity()` on `DOMContentLoaded` to set the initial density.
        *   Attach `updateDashboardDensity()` to the `window.onresize` event to react to viewport changes.
        ```javascript
        document.addEventListener('DOMContentLoaded', () => {
            // ... existing loads
            updateDashboardDensity();
        });
        window.addEventListener('resize', updateDashboardDensity);
        ```
    *   **CSS Integration**: Define CSS rules that target the `data-dashboard-density` attribute on the `body` or `.page` element to adjust layout, spacing, and font sizes according to the chosen density. This would be informed by the mockup PNG for density study (not provided).
        ```css
        /* Example CSS (illustrative, based on hypothetical mockup) */
        body[data-dashboard-density="compact"] .two-col {
            gap: 12px; /* Smaller gaps for compact */
        }
        body[data-dashboard-density="airy"] .two-col {
            gap: 24px; /* Larger gaps for airy */
        }
        /* Add other density-specific styles for padding, font-size, etc. */
        ```
*   **SSR/Client Boundary**: Exclusively client-side, as it relies on `window.innerWidth` and dynamic DOM state.

### SSR/Client Boundaries

All three utility functions (`clampMobileWidgetCount`, `resolveThemeMode`, `pickDashboardDensity`) are designed for client-side execution. They rely on browser-specific APIs (e.g., `window.innerWidth`, `localStorage`, `document.querySelectorAll`) and dynamic DOM manipulation. There are no apparent server-side rendering (SSR) implications for these specific utilities in the current `lifeos-dashboard.html` context. The initial HTML served would not directly use these functions; they would be loaded and executed once the client-side JavaScript runs.