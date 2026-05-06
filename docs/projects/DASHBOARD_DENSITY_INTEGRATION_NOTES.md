The task asks for Markdown documentation, but the 'JAVASCRIPT FULL FILE — STRICT OUTPUT CONTRACT' section specifies only JS/ESM source code. Prioritizing the explicit 'TASK: Document how...' instruction, this output is Markdown.

---
# Dashboard Layout Utilities Integration

This document outlines the integration strategy for `scripts/builder-smoke/dashboard-layout-utils.mjs` into the LifeOS dashboard shell. These utilities provide deterministic UI state management without involving the full AI rail, focusing on responsive and adaptive layout.

## `clampMobileWidgetCount` Integration

**Purpose:** Ensures the number of widgets displayed on mobile viewports remains within a sensible range (1-6), preventing excessive scrolling or layout issues.

**Integration:**
This utility should be invoked client-side when determining the number of widgets to render or display in a mobile-specific layout. It's particularly useful for:
1.  **Initial Mobile Render:** When the dashboard first loads on a mobile device, or when the viewport transitions to a mobile size.
2.  **Dynamic Widget Changes:** If users can add/remove widgets, this function can ensure the displayed count adheres to mobile constraints.

**Concrete DOM Hook Suggestions:**
*   **Client-Side Logic:** Within a React component (or similar framework) responsible for rendering the widget grid, call `clampMobileWidgetCount` on the `widgetCount` prop before mapping over the widgets.
    ```javascript
    // Example client-side usage
    import { clampMobileWidgetCount } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

    function DashboardMobileGrid({ widgets, isMobileViewport }) {
      if (!isMobileViewport) return <DesktopGrid widgets={widgets} />;

      const clampedCount = clampMobileWidgetCount(widgets.length);
      const widgetsToDisplay = widgets.slice(0, clampedCount);

      return (
        <div className="dashboard-mobile-grid" data-clamped-widget-count={clampedCount}>
          {widgetsToDisplay.map(widget => <Widget key={widget.id} {...widget} />)}
          {widgets.length > clampedCount && (
            <button>Show {widgets.length - clampedCount} more widgets</button>
          )}
        </div>
      );
    }
    ```
*   **CSS Classes/Attributes:** The clamped count could drive CSS classes (e.g., `mobile-widgets-4`) or `data-` attributes on the dashboard container to enable specific mobile-only styling.

**SSR/Client Boundaries:**
*   **SSR:** Not strictly necessary for SSR, as the server typically renders a full desktop view or a default mobile view. However, if the server can detect a mobile user agent, it could pre-render with a clamped count.
*   **Client:** Primarily client-side, reacting to viewport changes and dynamic content.

## `resolveThemeMode` Integration

**Purpose:** Standardizes theme mode input to "light", "dark", or "system", ensuring consistent application of visual themes.

**Integration:**
This function should be used early in the application lifecycle to determine the active theme. It can consume theme preferences from various sources:
1.  **User Preferences:** Stored in local storage, cookies, or a user profile in the database.
2.  **System Preferences:** Detected via `window.matchMedia('(prefers-color-scheme: dark)')`.

**Concrete DOM Hook Suggestions:**
*   **Root Element Class:** Apply the resolved theme mode as a class or `data-theme` attribute to the `<html>` or `<body>` element.
    ```javascript
    // Example client-side usage
    import { resolveThemeMode } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

    function applyTheme() {
      const userPreference = localStorage.getItem('theme') || 'system';
      const resolvedTheme = resolveThemeMode(userPreference);

      if (resolvedTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', resolvedTheme);
      }
    }

    // Call on load and listen for changes
    document.addEventListener('DOMContentLoaded', applyTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    ```
*   **CSS Variables:** CSS can then consume this attribute to apply appropriate styles (e.g., `[data-theme="dark"] { --bg-color: black; }`).

**SSR/Client Boundaries:**
*   **SSR:** The server can read user theme preferences (e.g., from a cookie) and inject the appropriate `data-theme` attribute directly into the `<html>` tag during the initial render. This prevents a "flash of unstyled content" (FOUC).
*   **Client:** JavaScript should run on the client to:
    *   Read and apply user preferences from local storage.
    *   Listen for changes in `prefers-color-scheme` and update the theme dynamically.
    *   Provide UI controls for users to switch themes.

## `pickDashboardDensity` Integration

**Purpose:** Dynamically adjusts the visual density of the dashboard ("compact", "balanced", "airy") based on viewport size, widget count, and the presence of a pinned navigation rail. (Referencing the mockup PNG for density study, which is not provided, but implies visual distinctions for these states).

**Integration:**
This is a critical function for responsive layout. It should be invoked whenever the parameters it depends on change:
1.  **Viewport Resizes:** The `viewportWidth` changes.
2.  **Widget Count Changes:** Widgets are added or removed.
3.  **Pinned Rail State Changes:** The user toggles a pinned navigation rail.

**Concrete DOM Hook Suggestions:**
*   **Root Dashboard Container Class:** Apply the resolved density as a class or `data-density` attribute to the main dashboard container element.
    ```javascript
    // Example client-side usage
    import { pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

    function updateDashboardDensity() {
      const dashboardContainer = document.getElementById('lifeos-dashboard');
      if (!dashboardContainer) return;

      const viewportWidth = window.innerWidth;
      const widgetCount = parseInt(dashboardContainer.dataset.widgetCount || '0', 10); // Assume data-widget-count is updated elsewhere
      const hasPinnedRail = dashboardContainer.classList.contains('has-pinned-rail');

      const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });
      dashboardContainer.setAttribute('data-density', density);
    }

    // Call on load and listen for changes
    document.addEventListener('DOMContentLoaded', updateDashboardDensity);
    window.addEventListener('resize', updateDashboardDensity);
    // Also call when widgetCount or hasPinnedRail state changes (e.g., via a state management system)
    ```
*   **CSS Styling:** CSS rules can then target these `data-density` attributes to adjust spacing, font sizes, and component dimensions.
    ```css
    /* Example CSS */
    .dashboard[data-density="compact"] {
      --widget-spacing: 8px;
      font-size: 0.8em;
    }
    .dashboard[data-density="airy"] {
      --widget-spacing: 24px;
      font-size: 1.1em;
    }
    ```

**SSR/Client Boundaries:**
*   **SSR:** The server can make an initial guess for density based on a default viewport width (e.g., desktop) and the initial widget count from the database. This provides a good starting point for the first render.
*   **Client:** This function is heavily client-side dependent due to `viewportWidth`. It must be run on the client, especially on `resize` events, to ensure the dashboard adapts dynamically. State management (e.g., Redux, Zustand) should manage `widgetCount` and `hasPinnedRail` and trigger re-evaluation of density.