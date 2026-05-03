The `docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md` file is missing, and the mockup PNG for density study was not provided. This documentation assumes standard dashboard layout principles and infers context from the provided `dashboard-layout-utils.mjs` and `lifeos-dashboard.html` files.

---

## Integrating Dashboard Layout Utilities

This document outlines the integration strategy for `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. The integration will primarily occur client-side within the existing `<script type="module">` block, leveraging DOM manipulation and event listeners.

### 1. Module Import

First, the utility functions must be imported into the main dashboard script. This should be done at the top of the `<script type="module">` block in `lifeos-dashboard.html`.

```javascript
import { clampMobileWidgetCount, resolveThemeMode, pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';
```

### 2. `resolveThemeMode` Integration

**Purpose:** Normalize theme mode values (e.g., from `localStorage`) to ensure consistency with "light", "dark", or "system".

**DOM Hooks & Client Boundary:**
This function should be used during the initial theme loading process and potentially within the `toggleTheme` function.

*   **Initial Load:** Modify the existing theme initialization logic (currently handled by `lifeos-theme.js` and the `DOMContentLoaded` listener) to use `resolveThemeMode` when reading `localStorage.getItem('lifeos_theme')`. This ensures that even if a malformed value is stored, the theme defaults gracefully to "system" (or "dark" as per current `toggleTheme` logic).
*   **`toggleTheme` Function:** While `toggleTheme` currently toggles between "light" and "dark", `resolveThemeMode` could be used if the theme source becomes more complex (e.g., reading from a user profile API) to ensure the value is always valid before applying it. For the current simple toggle, direct integration might not be strictly necessary but provides a robust guard.

**Example (Conceptual, assuming `lifeos-theme.js` is modified or its logic is moved):**

```javascript
// In the <script type="module"> block, or within lifeos-theme.js if it becomes a module
document.addEventListener('DOMContentLoaded', () => {
    // ... existing initVoice and other calls ...

    // Existing theme logic:
    // const th = document.documentElement.dataset.theme;
    // $('btn-theme').textContent = th === 'light' ? '☾' : '☀︎';

    // Enhanced theme init using resolveThemeMode:
    const storedTheme = localStorage.getItem('lifeos_theme');
    const initialTheme = resolveThemeMode(storedTheme || 'system'); // Default to 'system' if nothing stored
    document.documentElement.dataset.theme = initialTheme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : initialTheme;
    localStorage.setItem('lifeos_theme', document.documentElement.dataset.theme); // Ensure stored value is normalized
    $('btn-theme').textContent = document.documentElement.dataset.theme === 'light' ? '☾' : '☀︎';
});

// Modify existing toggleTheme function:
function toggleTheme() {
    const curr = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    const next = curr === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('lifeos_theme', next); // Store normalized value
    const mc = document.getElementById('theme-color-meta');
    if (mc) mc.setAttribute('content', next === 'light' ? '#f6f7fb' : '#0a0a0f');
    $('btn-theme').textContent = next === 'light' ? '☾' : '☀︎';
}
```

### 3. `clampMobileWidgetCount` Integration

**Purpose:** Ensure the number of widgets displayed on mobile is within a sensible range (1-6).

**DOM Hooks & Client Boundary:**
This function is purely client-side and should be applied whenever the number of widgets is determined or updated, especially for mobile layouts.

*   **Widget Rendering Logic:** When the dashboard dynamically loads or renders widgets, the count of widgets intended for display should be passed through `clampMobileWidgetCount` before any layout calculations or rendering loops.
*   **Example:** If a future AI rail or user setting determines `numWidgets`, use `const actualWidgetCount = clampMobileWidgetCount(numWidgets);` before rendering.

### 4. `pickDashboardDensity` Integration

**Purpose:** Dynamically adjust the dashboard's visual density ("compact", "balanced", "airy") based on viewport size, widget count, and the presence of a pinned AI rail.

**DOM Hooks & Client Boundary:**
This function is client-side and requires dynamic inputs. The output should be applied as a class to a root element (e.g., `<body>` or `.page`) to trigger CSS changes.

*   **Root Element for Density Class:** The `<body>` or `.page` element is suitable for applying density classes (e.g., `body.density-compact`).
*   **Inputs:**
    *   `viewportWidth`: Obtain via `window.innerWidth`.
    *   `widgetCount`: This needs to be dynamically calculated. A simple approach is to count the number of `.card` elements or a specific widget container.
    *   `hasPinnedRail`: Check for the existence and visibility of the `#lifeos-ai-rail-root` element. For initial integration without full AI rail, this could be a placeholder boolean or a check for `document.getElementById('lifeos-ai-rail-root') && document.getElementById('lifeos-ai-rail-root').children.length > 0`.
*   **Execution Triggers:**
    *   **`DOMContentLoaded`:** Run once on page load to set the initial density.
    *   **`window.resize` event:** Re-evaluate density whenever the viewport changes. Implement debouncing to prevent excessive calls.
    *   **Widget Count Changes:** If widgets are added or removed dynamically, re-evaluate density.
    *   **AI Rail State Changes:** If the AI rail can be pinned/unpinned, re-evaluate density.

**Example Integration (within `<script type="module">`):**

```javascript
// ... existing code ...

// Function to apply density
function applyDashboardDensity() {
    const viewportWidth = window.innerWidth;
    // Count visible cards as a proxy for widgetCount
    const widgetCount = document.querySelectorAll('.card').length;
    // Placeholder for hasPinnedRail until AI rail is fully implemented
    const aiRailRoot = $('lifeos-ai-rail-root');
    const hasPinnedRail = aiRailRoot && aiRailRoot.children.length > 0; // Check if rail exists and has content

    const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });

    // Apply density class to the body or .page element
    const targetElement = document.body; // Or $('page') if preferred
    targetElement.classList.remove('density-compact', 'density-balanced', 'density-airy');
    targetElement.classList.add(`density-${density}`);

    // Note: Corresponding CSS classes (e.g., .density-compact) must be added to lifeos-dashboard.html
    // or a linked stylesheet to define the visual changes for each density.
}

// Initial density application
document.addEventListener('DOMContentLoaded', applyDashboardDensity);

// Debounced resize listener for density
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyDashboardDensity, 150); // Debounce for 150ms
});

// Call applyDashboardDensity after any operation that changes widget count or AI rail state
// e.g., after loadMITs(), loadCal(), loadGoals(), loadScores() complete, or when AI rail state changes.
Promise.all([loadMITs(), loadCal(), loadGoals(), loadScores(), initChat()]).then(() => {
    applyDashboardDensity(); // Re-evaluate density after content loads
});
```

### 5. CSS Considerations for Density

The `pickDashboardDensity` function returns string values ("compact", "balanced", "airy"). To make these effective, corresponding CSS rules must be added to `lifeos-dashboard.html`'s `<style>` block or a linked stylesheet. These rules would target elements based on the applied density class (e.g., `body.density-compact .card { padding: 12px; }`). This is a follow-up task to define the visual characteristics of each density level.