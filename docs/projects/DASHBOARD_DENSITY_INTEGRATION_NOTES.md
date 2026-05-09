The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file is missing from the repository. This document outlines the integration of dashboard layout utilities into the dashboard shell.

---
# Dashboard Layout Utilities Integration

This document describes how the utility functions from `scripts/builder-smoke/dashboard-layout-utils.mjs` should be integrated into the `public/overlay/lifeos-dashboard.html` shell to manage responsive layouts and theme resolution.

## Overview

The `dashboard-layout-utils.mjs` file provides three core functions:
*   `clampMobileWidgetCount`: Ensures widget counts remain within a sensible range for mobile displays.
*   `resolveThemeMode`: Normalizes theme preference strings to 'light', 'dark', or 'system'.
*   `pickDashboardDensity`: Determines the overall dashboard layout density ('compact', 'balanced', 'airy') based on viewport, widget count, and AI rail state.

These utilities are designed for client-side execution to dynamically adjust the dashboard's presentation.

## Integration Strategy

The integration will primarily occur within the existing `<script type="module">` block in `lifeos-dashboard.html`. The utilities will be imported and then called on initial page load and in response to relevant events (e.g., window resize, changes in widget count or AI rail state).

## `clampMobileWidgetCount` Integration

*   **Purpose**: To constrain the number of widgets displayed on mobile devices to a practical range (1-6). This prevents excessive scrolling or an overly dense layout.
*   **Client-side Usage**: This function should be used whenever a widget count is determined or adjusted, particularly for mobile-specific layouts. For example, if an AI agent suggests a number of widgets, or a user preference is loaded, `clampMobileWidgetCount` would sanitize that value before it's used to render or hide widgets.
*   **DOM Hook Suggestions**: No direct DOM hook. This is a data processing utility. It would influence the number of `.dashboard-widget` elements rendered or displayed, or the CSS grid properties that depend on a widget count.
*   **SSR/Client Boundaries**: Primarily client-side. If an initial widget count is pre-rendered server-side, this function could be used during SSR to ensure the initial count is valid, but its main utility is for dynamic client-side adjustments.

## `resolveThemeMode` Integration

*   **Purpose**: To standardize theme preference values, ensuring consistency across different inputs (e.g., user settings, system preferences).
*   **Client-side Usage**: The `lifeos-dashboard.html` already includes `lifeos-theme.js` and a `toggleTheme` function. If a new source of truth for the theme (e.g., a user's saved preference from a server API) is introduced, `resolveThemeMode` should be used to normalize that value before applying it to `document.documentElement.dataset.theme` and `localStorage`.
*   **DOM Hook Suggestions**: No direct DOM hook. It's a utility for normalizing a theme string. The result would be applied to `document.documentElement.dataset.theme`.
*   **SSR/Client Boundaries**:
    *   **SSR**: Can be used to set the initial `data-theme` attribute on the `<html>` tag based on server-side user preferences, preventing a flash of unstyled content (FOUC).
    *   **Client**: Used when dynamically loading or updating theme preferences from external sources.

## `pickDashboardDensity` Integration

*   **Purpose**: To dynamically apply a layout density ('compact', 'balanced', 'airy') to the dashboard based on current viewport dimensions, the number of active widgets, and the state of the AI rail. This enables responsive and adaptive layouts.
*   **Client-side Usage**:
    1.  **Initial Load**: Call `pickDashboardDensity` on `DOMContentLoaded` using `window.innerWidth`, the count of active `.dashboard-widget` elements (e.g., `document.querySelectorAll('.dashboard-widget').length`), and the initial state of the AI rail (e.g., `false` if not yet pinned).
    2.  **Window Resize**: Attach a `resize` event listener to `window` (or use a `ResizeObserver`) to re-evaluate and apply the density whenever the viewport changes.
    3.  **Dynamic Content/State Changes**: Re-evaluate density if the number of visible widgets changes or if the AI rail's pinned state (`hasPinnedRail`) is toggled.
*   **DOM Hook Suggestions**:
    *   Apply the resulting density string as a `data-dashboard-density` attribute to a top-level container, such as `document.body` or the `.page` element. Example: `document.body.dataset.dashboardDensity = density;`.
    *   The `hasPinnedRail` parameter requires the AI rail's state. This state should be exposed by the `LifeOSDashboardAiRail` module (e.g., via a getter or a custom event) or inferred by checking a class/attribute on the `#lifeos-ai-rail-root` element.
*   **SSR/Client Boundaries**:
    *   **SSR**: An initial `data-dashboard-density` attribute can be rendered on `<body>` or `<html>` based on a default or a coarse user-agent detection.
    *   **Client**: This is the primary execution environment, enabling dynamic adjustments based on real-time viewport and content changes.

## CSS Considerations

Once `data-dashboard-density` is applied to `document.body` (or `.page`), CSS rules can be defined to react to these states:

```css
body[data-dashboard-density="compact"] .two-col {
  /* Adjust grid gap, padding, font sizes for compact layout */
  gap: 8px;
  padding: 12px 8px;
}

body[data-dashboard-density="airy"] .two-col {
  /* Adjust grid gap, padding, font sizes for airy layout */
  gap: 40px;
  padding: 40px 32px;
}

/* Default/balanced styles would be applied without a specific data-attribute or as a base */
```

This approach allows for a clear separation of layout logic (JavaScript) and presentation (CSS).