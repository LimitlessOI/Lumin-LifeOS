The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file was not found, so this documentation proceeds without its context. The mockup PNG for density study was also not provided.

---

## Dashboard Layout Utilities Integration

This document outlines the integration strategy for `scripts/builder-smoke/dashboard-layout-utils.mjs` into the LifeOS dashboard shell. The focus is on how these utilities inform UI rendering and behavior, without implementing the full AI rail.

### 1. `clampMobileWidgetCount` Integration

This utility ensures the number of widgets displayed on mobile devices remains within a sensible range (1-6).

*   **Purpose**: To prevent excessive scrolling or an empty dashboard view on smaller screens.
*   **DOM Hook Suggestions**:
    *   **Client-Side Rendering**: When a dashboard component (e.g., a React, Vue, or Svelte component) receives a list of widgets to render, it should pass the raw count to `clampMobileWidgetCount`. The returned value then dictates the maximum number of widgets to display.
    *   **Example**: `const widgetsToRender = allWidgets.slice(0, clampMobileWidgetCount(allWidgets.length));`
*   **SSR/Client Boundaries**:
    *   **SSR**: The initial server-rendered dashboard might use a default or user-configured widget count.
    *   **Client**: This function is primarily client-side, reacting to the actual number of widgets available and potentially viewport changes (though `pickDashboardDensity` handles viewport for overall density). It should be called within the client-side rendering logic for the widget grid.

### 2. `resolveThemeMode` Integration

This utility normalizes a given theme preference into one of 'light', 'dark', or 'system'.

*   **Purpose**: To consistently apply user or system theme preferences to the dashboard UI.
*   **DOM Hook Suggestions**:
    *   **Root Element Class**: The resolved theme mode should be applied as a class to the `<html>` or `<body>` element. This allows CSS to conditionally style based on the theme (e.g., `html.theme-dark { background: #333; }`).
    *   **Example**: `document.documentElement.classList.add(`theme-${resolveThemeMode(userPreference)}`);`
*   **SSR/Client Boundaries**:
    *   **SSR**: The initial theme class should be applied to the `<html>` tag during server-side rendering. This prevents a "flash of unstyled content" (FOUC) by ensuring the correct theme is present from the first paint. The server would read theme preference from a cookie or user session.
    *   **Client**: A small, non-blocking script at the top of the `<body>` (or within the main app bundle) should read local storage or system preferences (e.g., `window.matchMedia('(prefers-color-scheme: dark)')`) and update the `<html>` class if the preference changes or if the initial SSR theme needs adjustment. User-facing theme toggles would also call this function.

### 3. `pickDashboardDensity` Integration

This utility determines the overall visual density of the dashboard ('compact', 'airy', 'balanced') based on viewport width, widget count, and the presence of a pinned rail.

*   **Purpose**: To dynamically adjust the dashboard's layout and spacing for optimal readability and usability across different screen sizes and content loads.
*   **DOM Hook Suggestions**:
    *   **Dashboard Container Class**: The returned density string should be applied as a class to the main dashboard container element (e.g., `<div id="dashboard-main" class="density-balanced">`). CSS rules would then target these classes to adjust padding, margins, font sizes, and grid layouts.
    *   **Example**: `document.getElementById('dashboard-main').classList.add(`density-${pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail })}`);`
*   **SSR/Client Boundaries**:
    *   **SSR**: An initial density class can be applied to the dashboard container based on default assumptions (e.g., a common desktop viewport width, a typical widget count, and default rail state). This provides a baseline layout.
    *   **Client**: This function is primarily client-side driven.
        *   A `ResizeObserver` attached to the `window` or a relevant container should trigger a recalculation of `viewportWidth` and re-evaluate density.
        *   Changes to `widgetCount` (e.g., user adds/removes widgets) or `hasPinnedRail` (e.g., user toggles a sidebar) should also trigger a re-evaluation and update the dashboard container's class.
        *   The `viewportWidth` parameter should be derived from `window.innerWidth` or the width of the dashboard's parent container.
        *   `widgetCount` would come from the current state of the dashboard's widget collection.
        *   `hasPinnedRail` would be a boolean reflecting the state of a UI element.