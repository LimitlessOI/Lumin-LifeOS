## Dashboard Layout Utilities Integration

This document outlines the integration strategy for `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. These utilities provide client-side logic for dynamic layout adjustments based on user preferences and viewport characteristics.

### `clampMobileWidgetCount` Integration

The `clampMobileWidgetCount` function ensures that the number of widgets displayed on mobile devices remains within a reasonable range (1-6).

**Integration Point:** This function should be applied client-side when rendering lists of items within dashboard widgets, such as "Today's MITs," "Today's Schedule," and "Goals." After fetching data, the rendering logic for these sections would call `clampMobileWidgetCount` to determine the maximum number of items to display, especially when the viewport is narrow.

**DOM Hook Suggestion:**
Modify the `loadMITs()`, `loadCal()`, and `loadGoals()` functions to incorporate this clamping logic. For example, in `loadMITs()`:

```javascript
// In loadMITs()
const mits = (d.commitments||[]).filter(c=>c.is_mit);
const clampedMits = mits.slice(0, clampMobileWidgetCount(mits.length)); // Apply clamp here
if (!clampedMits.length) {
  $('mits-list').innerHTML='<div class="empty"><span>✅</span>No MITs — add one below</div>';
  return;
}
$('mits-list').innerHTML = clampedMits.map(...).join('');
```

### `resolveThemeMode` Integration

The `resolveThemeMode` function normalizes a theme preference value to 'light', 'dark', or 'system'.

**Integration Point:** While the existing `toggleTheme()` function directly switches between 'light' and 'dark' and stores it in `localStorage`, `resolveThemeMode` can be used to robustly interpret the initial theme setting on page load. This is particularly useful if a 'system' theme preference is introduced or if the theme is ever set from a server-side user profile.

**DOM Hook Suggestion:**
In the `DOMContentLoaded` listener, when the initial theme is set, use `resolveThemeMode` to ensure the value is valid:

```javascript
// In document.addEventListener('DOMContentLoaded', ...)
const storedTheme = localStorage.getItem('lifeos_theme');
const initialTheme = resolveThemeMode(storedTheme); // Use the utility here
document.documentElement.dataset.theme = initialTheme;
$('btn-theme').textContent = initialTheme === 'light' ? '☾' : '☀︎';
// Update meta theme color based on initialTheme
const mc = document.getElementById('theme-color-meta');
if (mc) mc.setAttribute('content', initialTheme === 'light' ? '#f6f7fb' : '#0a0a0f');
```

### `pickDashboardDensity` Integration

The `pickDashboardDensity` function determines the overall dashboard layout density ('compact', 'airy', 'balanced') based on viewport width, the total number of active widgets, and the state of the AI rail. This function is central to the density study referenced in the mockup PNG.

**Dependencies:**
*   **`viewportWidth`**: Obtainable from `window.innerWidth`.
*   **`widgetCount`**: This requires a dynamic calculation of the total number of visible items across all dashboard sections (MITs, Calendar, Goals, Scores, Chat messages).
*   **`hasPinnedRail`**: This state needs to be derived from the AI rail component (`lifeos-dashboard-ai-rail.js`) once its pinning functionality is implemented. A simple approach would be to check for a specific class on the `#lifeos-ai-rail-root` element.

**Application:**
The result of `pickDashboardDensity` should be applied as a data attribute or class to a top-level container (e.g., `<body>` or `.page`) to allow CSS to adapt the layout.

**DOM Hook Suggestions:**
1.  **Initial Load:** Call `pickDashboardDensity` once the DOM is ready and initial widget data is loaded.
2.  **Resize Listener:** Attach an event listener to `window.resize` to recalculate and apply density changes.
3.  **Widget Count Changes:** Trigger a density recalculation whenever the number of visible widgets changes (e.g., after `loadMITs()`, `loadCal()`, `loadGoals()`, `loadScores()` complete, or chat messages are added/removed).
4.  **AI Rail State Changes:** If the AI rail can be pinned/unpinned, its state change should also trigger a density recalculation.

```javascript
// Example client-side logic
import { pickDashboardDensity } from './scripts/builder-smoke/dashboard-layout-utils.mjs';

function applyDashboardDensity() {
  const viewportWidth = window.innerWidth;
  // Calculate total widget count (sum of visible items in MITs, Calendar, Goals, Scores, etc.)
  const mitCount = $('mits-list').querySelectorAll('.mit-item').length;
  const calCount = $('cal-list').querySelectorAll('.event-row').length;
  const goalCount = $('goals-list').querySelectorAll('.goal-row').length;
  const scoreCount = $('scores-grid').querySelectorAll('.score-tile').length;
  const chatMsgCount = $('chat-messages').querySelectorAll('.msg').length;
  const widgetCount = mitCount + calCount + goalCount + scoreCount + chatMsgCount;

  // Determine if AI rail is pinned (assuming a class 'pinned' on the rail root)
  const hasPinnedRail = $('lifeos-ai-rail-root').classList.contains('pinned');

  const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });
  document.body.dataset.dashboardDensity = density; // Apply as data attribute
}

// Call on initial load
document.addEventListener('DOMContentLoaded', applyDashboardDensity);
// Call on window resize
window.addEventListener('resize', applyDashboardDensity);
// Call after data loads (e.g., in Promise.all after all load functions)
Promise.all([loadMITs(), loadCal(), loadGoals(), loadScores(), initChat()]).then(applyDashboardDensity);
// Add calls to applyDashboardDensity() whenever AI rail state changes
```

**CSS Implications:**
New CSS rules would be required to define the visual differences for each density mode. These rules would target `body[data-dashboard-density="compact"]`, `body[data-dashboard-density="airy"]`, and `body[data-dashboard-density="balanced"]` to adjust padding, font sizes, grid gaps, and other layout properties. This would augment or override existing media query styles.

### SSR/Client Boundaries

All three utility functions (`clampMobileWidgetCount`, `resolveThemeMode`, `pickDashboardDensity`) are designed for client-side execution. They rely on browser-specific APIs (`window.innerWidth`) or dynamic DOM content.

*   **`clampMobileWidgetCount`**: Purely client-side, as it depends on the number of rendered widgets and potentially mobile viewport detection.
*   **`resolveThemeMode`**: Primarily client-side for dynamic theme switching and `localStorage` interaction. Could be used server-side if an initial theme preference is rendered into the HTML.
*   **`pickDashboardDensity`**: Purely client-side, as it relies heavily on `viewportWidth` and dynamically calculated `widgetCount` and `hasPinnedRail` states.