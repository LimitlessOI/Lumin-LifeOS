The `scripts/builder-smoke/dashboard-layout-utils.mjs` module provides utility functions for dynamically adjusting the dashboard's visual presentation based on user preferences, viewport characteristics, and content. These functions are intended for client-side integration within `public/overlay/lifeos-dashboard.html`.

### Integration of `resolveThemeMode`

**Purpose:** Normalizes a theme preference value to 'light', 'dark', or 'system'.

**DOM Hook Suggestions:**
The `lifeos-dashboard.html` already manages theme state via `localStorage.getItem('lifeos_theme')` and `document.documentElement.dataset.theme`. The `resolveThemeMode` function should be imported and used to process the value retrieved from `localStorage` before applying it to `document.documentElement.dataset.theme`.

**Example Client-Side Usage (within `<script type="module">`):**
```javascript
import { resolveThemeMode } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

// ... inside DOMContentLoaded listener or theme initialization logic
const savedTheme = localStorage.getItem('lifeos_theme');
const effectiveTheme = resolveThemeMode(savedTheme); // Use the utility
document.documentElement.dataset.theme = effectiveTheme;
// Update UI elements like the theme toggle button based on effectiveTheme
```

**SSR/Client Boundary:** This function is purely client-side, operating on browser-specific storage (`localStorage`) and DOM elements.

### Integration of `pickDashboardDensity`

**Purpose:** Determines the optimal dashboard density ('compact', 'airy', 'balanced') based on viewport width, widget count, and the presence of a pinned AI rail.

**DOM Hook Suggestions:**
1.  **Dynamic Parameters:**
    *   `viewportWidth`: Obtain from `window.innerWidth`.
    *   `widgetCount`: Dynamically count visible dashboard widgets, e.g., `document.querySelectorAll('.dashboard-widget:not(.hidden)').length`.
    *   `hasPinnedRail`: This state would be managed by `lifeos-dashboard-ai-rail.js`. For initial integration, a simple check for the visibility or existence of `#lifeos-ai-rail-root` could be used, or a global flag set by the AI rail script.
2.  **Applying Density:** The returned density string ('compact', 'airy', 'balanced') should be applied as a `data-attribute` to a high-level element like `document.documentElement` or `document.body`.

**Example Client-Side Usage (within `<script type="module">`):**
```javascript
import { pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

function applyDashboardDensity() {
  const viewportWidth = window.innerWidth;
  const widgetCount = document.querySelectorAll('.dashboard-widget').length; // Adjust if widgets can be hidden
  const hasPinnedRail = document.getElementById('lifeos-ai-rail-root')?.classList.contains('pinned') || false; // Assuming a 'pinned' class

  const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });
  document.documentElement.dataset.dashboardDensity = density;
  // CSS rules would then target `html[data-dashboard-density="compact"]` etc.
}

// Call on initial load and window resize
document.addEventListener('DOMContentLoaded', applyDashboardDensity);
window.addEventListener('resize', applyDashboardDensity);
```

**CSS Integration:**
Define CSS rules that target `html[data-dashboard-density="compact"]`, `html[data-dashboard-density="balanced"]`, and `html[data-dashboard-density="airy"]` to adjust padding, font sizes, or grid gaps as per the desired density. (Note: Mockup PNG for density study was not provided, so specific CSS values are omitted.)

**SSR/Client Boundary:** This function is purely client-side, relying on `window` properties and dynamic DOM state.

### Integration of `clampMobileWidgetCount`

**Purpose:** Ensures a given widget count is within a reasonable range (1-6), primarily for mobile layouts.

**DOM Hook Suggestions:**
This function would be used internally by the logic that determines which widgets to display, especially when the dashboard is in a mobile or compact state. It would influence the `widgetCount` parameter passed to `pickDashboardDensity` or directly control the number of widgets rendered in a specific view.

**Example Client-Side Usage (within `<script type="module">`):**
```javascript
import { clampMobileWidgetCount } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

// ... inside a function that determines how many widgets to show on mobile
function renderMobileWidgets(availableWidgets) {
  const desiredCount = /* logic to determine user preference or AI suggestion */;
  const actualCount = clampMobileWidgetCount(desiredCount);
  // Render 'actualCount' number of widgets
}
```

**SSR/Client Boundary:** This function is purely client-side, used for dynamic rendering logic based on client-side conditions.

---
ASSUMPTIONS:
- The mockup PNG for density study was not provided, so specific visual adjustments for density are not detailed.
- The `hasPinnedRail` parameter for `pickDashboardDensity` assumes the AI rail will have a mechanism (e.g., a class like `pinned`) to indicate its state.
- The `widgetCount` for `pickDashboardDensity` is assumed to be the count of currently visible widgets.