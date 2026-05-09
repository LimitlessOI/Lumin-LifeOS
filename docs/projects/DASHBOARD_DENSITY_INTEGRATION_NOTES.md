The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file is missing from the repository.

---
This document outlines the integration strategy for `scripts/builder-smoke/dashboard-layout-utils.mjs` into the LifeOS dashboard shell. These utilities provide deterministic layout and theme resolution, serving as foundational components for the dashboard's responsive design, independent of the full AI rail implementation.

### General Integration Strategy

The functions in `dashboard-layout-utils.mjs` are pure, client-side utilities. They should be imported and consumed by a central client-side layout manager or a root dashboard component. This manager would be responsible for:
1.  Listening to browser events (e.g., `resize`, `matchMedia` for theme changes).
2.  Maintaining the current state of the dashboard (e.g., widget count, pinned rail status).
3.  Applying the resolved layout and theme states as CSS classes to appropriate DOM elements.

### `clampMobileWidgetCount`

*   **Purpose:** Ensures the number of widgets displayed on mobile viewports remains within a sensible range (1-6). This prevents layout overflow or underutilization on small screens.
*   **Integration:** This function should be called client-side whenever the number of widgets for a mobile layout is determined or updated. It acts as a guardrail for the widget count.
*   **DOM Hook Suggestions:**
    *   Not a direct DOM hook, but informs the rendering logic. For example, if a mobile-specific widget container is rendered, the `count` passed to its rendering function would first be processed by `clampMobileWidgetCount`.
    *   Example: `const mobileWidgetCount = clampMobileWidgetCount(currentWidgetCount);` then render `mobileWidgetCount` widgets.
*   **SSR/Client Boundaries:** Primarily client-side. While an initial mobile widget count could be set on SSR, the dynamic nature of user interaction and responsive adjustments makes this function most relevant for client-side state management and rendering.

### `resolveThemeMode`

*   **Purpose:** Normalizes theme preference input (e.g., from user settings, local storage, or system preference) into a consistent "light", "dark", or "system" value.
*   **Integration:** Used client-side to determine the active theme. This resolved theme should then be applied to the root of the application's DOM.
*   **DOM Hook Suggestions:**
    *   **Client-side:** Apply a class to the `<html>` or `<body>` element.
        ```javascript
        import { resolveThemeMode } from './dashboard-layout-utils.mjs';
        // ...
        const userPreference = localStorage.getItem('theme') || 'system';
        const resolvedTheme = resolveThemeMode(userPreference);
        document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-system'); // Clear previous
        document.documentElement.classList.add(`theme-${resolvedTheme}`);
        ```
    *   Listen for system theme changes: `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => { /* re-evaluate theme */ });`
*   **SSR/Client Boundaries:**
    *   **SSR:** The initial theme can be determined on the server (e.g., from user profile data) and injected directly into the `<html>` tag's `class` attribute to prevent a Flash of Unstyled Content (FOUC).
    *   **Client-side:** JavaScript takes over to handle dynamic theme changes (user toggles, system preference changes) and persist choices.

### `pickDashboardDensity`

*   **Purpose:** Determines the visual density ("compact", "balanced", "airy") of the dashboard based on viewport width, current widget count, and the presence of a pinned rail. This directly influences spacing and element sizing.
*   **Integration:** This function should be called client-side on initial load and whenever relevant parameters change (viewport resize, widget count update, pinned rail toggle). The resulting density should be applied as a CSS class to the main dashboard container.
*   **DOM Hook Suggestions:**
    *   **Client-side:** Apply a class to the primary dashboard wrapper element.
        ```javascript
        import { pickDashboardDensity } from './dashboard-layout-utils.mjs';
        // ...
        function updateDashboardDensity() {
          const viewportWidth = window.innerWidth;
          const widgetCount = getActiveWidgetCount(); // Assume this function exists
          const hasPinnedRail = document.getElementById('pinned-rail') !== null; // Or from state
          const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });

          const dashboardContainer = document.getElementById('dashboard-main');
          if (dashboardContainer) {
            dashboardContainer.classList.remove('density-compact', 'density-balanced', 'density-airy'); // Clear previous
            dashboardContainer.classList.add(`density-${density}`);
          }
        }
        window.addEventListener('resize', updateDashboardDensity);
        // Call on initial load and after widget count changes
        updateDashboardDensity();
        ```
*   **SSR/Client Boundaries:** Primarily client-side. `viewportWidth` is a client-side property, making this function most effective when executed in the browser. While a default density could be rendered on SSR, it would likely be overridden quickly by client-side evaluation.