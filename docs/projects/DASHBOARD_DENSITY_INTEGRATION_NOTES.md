`docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` is missing, so the output is grounded in the provided code and general domain context.

The `scripts/builder-smoke/dashboard-layout-utils.mjs` module provides deterministic helpers for managing UI state related to theme and dashboard density. Integration into `public/overlay/lifeos-dashboard.html` should follow existing client-side patterns, primarily within the `<script type="module">` block.

### Importing Utilities

The utility functions should be imported as an ES module within the main dashboard script block. This ensures they are available for client-side logic.

```javascript
// Inside <script type="module"> block in public/overlay/lifeos-dashboard.html
import { clampMobileWidgetCount, resolveThemeMode, pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';
```

### `resolveThemeMode` Integration

**Purpose:** Ensures the theme setting is always one of "light", "dark", or "system", handling invalid or missing values gracefully.

**Proposed Integration Points:**

1.  **Initial Theme Load:** When the dashboard first loads, use `resolveThemeMode` to normalize the theme retrieved from `localStorage` before applying it to `document.documentElement.dataset.theme`.
2.  **Theme Toggle:** Update the `toggleTheme()` function to use `resolveThemeMode` to determine the `next` theme, ensuring consistency.

**DOM Hooks / Client Boundaries:**

*   **Client-side:** This function operates entirely client-side, relying on `localStorage` and `document.documentElement`.
*   **`DOMContentLoaded` Listener:** Modify the existing listener to call `resolveThemeMode` on the `localStorage.getItem('lifeos_theme')` value.
*   **`toggleTheme()` Function:** Integrate `resolveThemeMode` when calculating the `next` theme state.

**Example Snippet (Conceptual):**

```javascript
// In the <script type="module"> block
// ...
// Initial theme sync
document.addEventListener('DOMContentLoaded', () => {
    initVoice();
    const storedTheme = localStorage.getItem('lifeos_theme');
    const resolvedTheme = resolveThemeMode(storedTheme || 'system'); // Default to system if not found
    document.documentElement.dataset.theme = resolvedTheme;
    $('btn-theme').textContent = resolvedTheme === 'light' ? '☾' : '☀︎';
    // ... other initializations
    applyDashboardDensity(); // Call density function here
});

// ...
// Inside toggleTheme()
function toggleTheme() {
    const currentRawTheme = document.documentElement.dataset.theme;
    const currentResolvedTheme = resolveThemeMode(currentRawTheme);
    const nextRawTheme = currentResolvedTheme === 'light' ? 'dark' : 'light'; // Assuming toggle only between light/dark for now
    const nextResolvedTheme = resolveThemeMode(nextRawTheme); // Re-resolve for safety, though not strictly needed here if logic is simple
    document.documentElement.dataset.theme = nextResolvedTheme;
    localStorage.setItem('lifeos_theme', nextResolvedTheme);
    const mc = document.getElementById('theme-color-meta');
    if (mc) mc.setAttribute('content', nextResolvedTheme === 'light' ? '#f6f7fb' : '#0a0a0f');
    $('btn-theme').textContent = nextResolvedTheme === 'light' ? '☾' : '☀︎';
}
```

### `clampMobileWidgetCount` Integration

**Purpose:** To ensure that the number of widgets considered for layout on mobile devices remains within a sensible range (1-6), preventing UI overflow or underutilization.

**Proposed Integration Points:**

*   **Input to `pickDashboardDensity`:** This function is primarily intended to provide a normalized `widgetCount` parameter for `pickDashboardDensity`, especially when the actual number of widgets might be dynamic or exceed mobile display limits.
*   **Dynamic Widget Rendering (Future):** If the dashboard were to dynamically render widgets based on user preferences or AI suggestions, `clampMobileWidgetCount` would be used to limit the number of widgets actually rendered on mobile viewports.

**DOM Hooks / Client Boundaries:**

*   **Client-side:** This function is purely client-side, operating on numerical inputs.
*   **Indirect DOM Impact:** It doesn't directly manipulate the DOM but influences other functions that might, such as `pickDashboardDensity` or a future widget rendering loop.

**Example Snippet (Conceptual, as input to `pickDashboardDensity`):**

```javascript
// In the <script type="module"> block, within applyDashboardDensity()
// ...
const actualWidgetCount = /* Logic to count currently visible or configured widgets */;
const clampedWidgetCount = clampMobileWidgetCount(actualWidgetCount);
// ... pass clampedWidgetCount to pickDashboardDensity
```

### `pickDashboardDensity` Integration

**Purpose:** Dynamically adjusts the visual density of the dashboard ("compact", "balanced", "airy") based on viewport size, widget count, and the presence of a pinned AI rail. This allows for a responsive and optimized layout across devices.

**Proposed Integration Points:**

1.  **Initial Load:** Calculate and apply the initial density class when the dashboard loads.
2.  **Window Resize:** Recalculate and update the density class whenever the browser window is resized.
3.  **AI Rail State Change (Future):** If the `hasPinnedRail` state can change dynamically (e.g., user pins/unpins the rail), the density should be re-evaluated.

**DOM Hooks / Client Boundaries:**

*   **Client-side:** This function relies on client-side properties like `window.innerWidth` and dynamic state.
*   **`<body>` or `.page` Class:** The returned density string ("compact", "balanced", "airy") should be applied as a class to a top-level container element, such as the `<body>` or the `.page` div. This allows CSS to respond to the density setting.
*   **`DOMContentLoaded` Listener:** Add a call to a new function (e.g., `applyDashboardDensity()`) within this listener.
*   **`window.onresize` Event:** Attach `applyDashboardDensity()` to the `window.onresize` event.

**CSS Implications:**

*   Define CSS rules that target `body.compact`, `body.balanced`, `body.airy` (or `.page.compact`, etc.) to adjust padding, margins, font sizes, and grid gaps according to the desired density. (Referencing the mockup PNG for specific visual adjustments would be done here if available).

**Example Snippet (Conceptual):**

```javascript
// In the <script type="module"> block
// ...
function applyDashboardDensity() {
    const viewportWidth = window.innerWidth;
    // For now, assume a static widget count or derive from visible cards.
    // In a future dynamic system, this would be the actual number of active widgets.
    // Counting the main content cards: MITs, Calendar, Goals, Scores, Chat = 5
    const widgetCount = 5; 
    // Assuming 'lifeos-dashboard-ai-rail.js' adds a 'pinned' class to its root when active
    const hasPinnedRail = document.getElementById('lifeos-ai-rail-root')?.classList.contains('pinned') || false; 
    
    const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });
    
    const pageElement = document.querySelector('.page'); // Or document.body
    if (pageElement) {
        pageElement.classList.remove('compact', 'balanced', 'airy'); // Remove existing
        pageElement.classList.add(density); // Add new
    }
}

// Initial application (already added to DOMContentLoaded in theme section)
// Re-apply on resize
window.addEventListener('resize', applyDashboardDensity);
```

### General Considerations

*   **Dynamic Widget Count:** The `widgetCount` parameter for `pickDashboardDensity` will need a robust mechanism to count active widgets once the dashboard becomes more dynamic. For initial documentation, a placeholder or count of visible cards is sufficient.
*   **AI Rail State:** The `hasPinnedRail` parameter depends on the `lifeos-dashboard-ai-rail.js` script and its associated DOM. A mechanism to query its state (e.g., a class on `#lifeos-ai-rail-root` or a global variable exposed by the AI rail script) will be necessary.
*   **CSS Definition:** The actual visual changes for "compact", "balanced", and "airy" densities will need to be defined in `lifeos-dashboard-tokens.css` or the inline `<style>` block within `lifeos-dashboard.html`.