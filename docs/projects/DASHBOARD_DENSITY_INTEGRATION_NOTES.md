**Integration of Dashboard Layout Utilities**

This document outlines the integration of the `dashboard-layout-utils.mjs` functions into the `lifeos-dashboard.html` shell, focusing on client-side execution and DOM interaction. (Note: The referenced mockup PNG for density study was not provided.)

### `resolveThemeMode` Integration

The `resolveThemeMode` utility normalizes theme values to 'light', 'dark', or 'system'. This ensures consistent theme application by processing values retrieved from `localStorage`.

**DOM Hook Suggestion:**
*   **Client-side**: Within the main `<script type="module">` block in `lifeos-dashboard.html`, use `resolveThemeMode` when initializing the theme on `DOMContentLoaded`. This will sanitize the `localStorage.getItem('lifeos_theme')` value before applying it to `document.documentElement.dataset.theme`.

**Example Client-side Usage (within `DOMContentLoaded`):**
```javascript
import { resolveThemeMode } from './scripts/builder-smoke/dashboard-layout-utils.mjs';

// ...
const savedTheme = localStorage.getItem('lifeos_theme');
const resolvedTheme = resolveThemeMode(savedTheme);

if (resolvedTheme === 'system') {
  // Default to dark if 'system' is resolved and no specific system preference logic is implemented yet
  document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
} else {
  document.documentElement.dataset.theme = resolvedTheme;
}
localStorage.setItem('lifeos_theme', document.documentElement.dataset.theme); // Store the normalized theme
// ... rest of theme application logic
```

### `clampMobileWidgetCount` Integration

The `clampMobileWidgetCount` function ensures a widget count is within a predefined range (1-6). This is useful for controlling the number of widgets displayed, particularly on smaller viewports, to optimize layout and prevent excessive content.

**DOM Hook Suggestion:**
*   **Client-side**: This function would be applied conceptually when a dynamic widget rendering system determines how many widgets to display in the `NEW WIDGETS ROW` or similar containers. It acts as a guard for the number of items to render.

**Example Client-side Usage (Conceptual):**
```javascript
import { clampMobileWidgetCount } from './scripts/builder-smoke/dashboard-layout-utils.mjs';

// ... when a future dynamic widget loader determines how many widgets to show
const availableWidgets = /* array of widgets */;
const desiredDisplayCount = /* user preference or AI suggestion */;
const actualDisplayCount = clampMobileWidgetCount(desiredDisplayCount);
// Render 'actualDisplayCount' widgets into the DOM, e.g., into the <div class="two-col mb-4"> container
```

### `pickDashboardDensity` Integration

The `pickDashboardDensity` function determines the optimal visual density ('compact', 'airy', 'balanced') based on `viewportWidth`, `widgetCount`, and `hasPinnedRail`. This enables a more nuanced adaptive layout than traditional media queries alone.

**Client-side Execution:**
This function should be executed client-side on initial page load (`DOMContentLoaded`) and whenever the viewport size changes (`window.onresize`).

**Determining Inputs:**
1.  **`viewportWidth`**: Obtain directly from `window.innerWidth`.
2.  **`widgetCount`**: This refers to the *actual number of visible dashboard widgets* currently rendered in the DOM. This can be determined by counting elements with the `dashboard-widget` class that are not hidden.
3.  **`hasPinnedRail`**: This state should be exposed by the AI rail script (`lifeos-dashboard-ai-rail.js`). A concrete DOM hook would be to check for a specific class on the AI rail root element, e.g., `document.getElementById('lifeos-ai-rail-root')?.classList.contains('pinned')`.

**Applying Density Styles (DOM Hook Suggestion):**
*   **HTML `data-density` attribute**: Set a `data-density` attribute on the `<body>` element (e.g., `<body data-density="compact">`).
*   **CSS Styling**: Define CSS rules that target this attribute to adjust layout properties (e.g., padding, margins, font sizes) for each density state.

**Example Client-side Usage (within `<script type="module">`):**
```javascript
import { pickDashboardDensity } from './scripts/builder-smoke/dashboard-layout-utils.mjs';

function applyDashboardDensity() {
  const viewportWidth = window.innerWidth;
  const widgetCount = document.querySelectorAll('.dashboard-widget:not(.hidden)').length; // Count visible widgets
  const hasPinnedRail = document.getElementById('lifeos-ai-rail-root')?.classList.contains('pinned') || false; // Assumes AI rail manages 'pinned' class

  const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });
  document.body.dataset.density = density;
}

document.addEventListener('DOMContentLoaded', () => {
  // ... existing load functions
  applyDashboardDensity();
});
window.addEventListener('resize', applyDashboardDensity);
```

### SSR/Client Boundaries

All three utility functions (`clampMobileWidgetCount`, `resolveThemeMode`, `pickDashboardDensity`) are designed for client-side execution. They rely on browser-specific APIs (e.g., `window.innerWidth`, `localStorage`, DOM manipulation) and dynamic runtime conditions. The `lifeos-dashboard.html` is served as a static file, with all dynamic behavior handled by client-side JavaScript. Therefore, there are no SSR integration points for these specific utilities; their integration is entirely within the client-side JavaScript bundle.