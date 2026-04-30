The specification for this task is contradictory. The "SPECIFICATION" section explicitly requests Markdown output, while the "INSTRUCTION" and "HTML FULL FILE — STRICT OUTPUT CONTRACT" sections imply a code output, specifically a full HTML file replacement. Given the task is to "Document how... should integrate," and the "SPECIFICATION" directly states "Markdown," I will prioritize the Markdown output as documentation. The HTML contract is interpreted as applying when the `target_file` is an HTML file and the mode is `code` for direct modification, which is not the case for this documentation task.

---

## Dashboard Layout Utilities Integration

This document outlines the integration strategy for `scripts/builder-smoke/dashboard-layout-utils.mjs` into the `public/overlay/lifeos-dashboard.html` shell. The goal is to leverage these utilities for dynamic layout adjustments without implementing the full AI rail at this stage.

**Note:** The referenced mockup PNG for density study was not provided, so density recommendations are based solely on the function's logic.

### 1. `clampMobileWidgetCount`

**Purpose:** Ensures the number of widgets displayed on mobile devices remains within a reasonable range (1-6).

**Integration Strategy:**
This function is primarily for client-side use when dynamically rendering a variable number of widgets. In the current `lifeos-dashboard.html`, the main content sections (MITs, Calendar, Goals, Scores, Chat) are fixed. If future iterations introduce a dynamic widget system where the user can add/remove widgets, `clampMobileWidgetCount` would be applied to the total count of *available* widgets before deciding how many to render on smaller viewports.

**DOM Hook Suggestions:**
*   **Client-side:** Use within a client-side rendering function that determines the number of widgets to display.
    ```javascript
    import { clampMobileWidgetCount } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

    // Example: If `allWidgets` is an array of available widgets
    const rawWidgetCount = allWidgets.length;
    const mobileDisplayCount = clampMobileWidgetCount(rawWidgetCount);
    // Render only the first `mobileDisplayCount` widgets for mobile viewports.
    ```

**SSR/Client Boundaries:**
*   **Client-side only:** Its utility is tied to dynamic client-side rendering decisions based on available content and viewport constraints.

### 2. `resolveThemeMode`

**Purpose:** Normalizes a given theme value to one of 'light', 'dark', or 'system'.

**Integration Strategy:**
The dashboard already has a theme toggling mechanism (`toggleTheme` function and `lifeos-theme.js`). `resolveThemeMode` can be used to ensure any initial theme preference (e.g., from `localStorage` or a server-side user setting) is a valid and recognized value before being applied.

**DOM Hook Suggestions:**
*   **Client-side (Initial Load & Toggle):** Integrate into the existing theme initialization logic within the `<script type="module">` block and the `toggleTheme` function.

    ```javascript
    import { resolveThemeMode } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

    // ... inside the <script type="module"> block ...

    // Update existing toggleTheme function
    window.toggleTheme = function() {
        const curr = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
        const next = resolveThemeMode(curr === 'light' ? 'dark' : 'light'); // Use resolveThemeMode
        if (window.__lifeosTheme) window.__lifeosTheme.set(next);
        else document.documentElement.dataset.theme = next;
        $('btn-theme').textContent = next === 'light' ? '☾' : '☀︎';
        const mc = document.getElementById('theme-color-meta');
        if (mc) mc.setAttribute('content', next === 'light' ? '#f6f7fb' : '#0a0a0f');
    };

    document.addEventListener('DOMContentLoaded', () => {
        // ... existing initVoice() ...
        // Initial theme sync, updated to use resolveThemeMode
        const storedTheme = localStorage.getItem('lifeos_theme_preference'); // Example: assuming a storage key
        const initialTheme = resolveThemeMode(storedTheme || 'system');
        if (window.__lifeosTheme) window.__lifeosTheme.set(initialTheme);
        else document.documentElement.dataset.theme = initialTheme;
        $('btn-theme').textContent = initialTheme === 'light' ? '☾' : '☀︎';
    });
    ```

**SSR/Client Boundaries:**
*   **Both:** Can be used on SSR to set the initial `data-theme` attribute on the `<html>` tag based on user preferences, and on the client for dynamic toggling and local storage persistence.

### 3. `pickDashboardDensity`

**Purpose:** Determines the optimal dashboard density ('compact', 'airy', 'balanced') based on viewport width, widget count, and the presence of a pinned navigation rail.

**Integration Strategy:**
This function requires dynamic inputs (`viewportWidth`, `widgetCount`, `hasPinnedRail`) and should be called on initial load and whenever the viewport resizes. The resulting density string should be applied as a class or data attribute to a main container element (e.g., `<body>` or `.page`) to allow CSS to adjust the layout.

**Assumptions for `pickDashboardDensity`:**
*   `widgetCount`: For the current `lifeos-dashboard.html`, this refers to the number of primary content cards/sections (MITs, Calendar, Goals, Scores, Chat), which is `5`.
*   `hasPinnedRail`: This is a conceptual boolean flag. The current dashboard does not have an explicit "pinned rail." For integration, this would be a state variable, potentially controlled by a user setting or a future UI component. For initial implementation, it could default to `false`.

**DOM Hook Suggestions:**
*   **Client-side (Dynamic Class Application):**
    1.  **Import:** Import the function into the `<script type="module">` block.
    2.  **Initial Call:** Call `applyDensity()` on `DOMContentLoaded`.
    3.  **Resize Listener:** Add an event listener for `window.resize` to re-evaluate and apply density.
    4.  **CSS:** Define CSS rules that respond to the `data-density` attribute or a class on the `<body>` or `.page` element.

    ```javascript
    import { pickDashboardDensity } from '../scripts/builder-smoke/dashboard-layout-utils.mjs';

    // ... inside the <script type="module"> block ...

    let hasPinnedRail = false; // Placeholder; would be dynamic in a full implementation

    function applyDensity() {
        const viewportWidth = window.innerWidth;
        const widgetCount = 5; // Current fixed number of main dashboard cards
        const density = pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail });

        // Apply as a data attribute to the main container (e.g., body or .page)
        document.body.dataset.density = density;
        // Example CSS (to be defined in <style> or a separate CSS file):
        /*
        body[data-density="compact"] .card { padding: 12px; border-radius: var(--radius-md); }
        body[data-density="airy"] .card { padding: 28px; border-radius: var(--radius-xl); }
        body[data-density="compact"] .two-col { gap: 10px; }
        */
    }

    document.addEventListener('DOMContentLoaded', () => {
        // ... existing initVoice() and theme setup ...
        applyDensity(); // Initial density application
    });

    window.addEventListener('resize', applyDensity); // Re-apply on resize

    // If a future UI element controls hasPinnedRail, update it and call applyDensity()
    // function togglePinnedRail(state) {
    //     hasPinnedRail = state;
    //     applyDensity();
    // }
    ```

**SSR/Client Boundaries:**
*   **Primarily Client-side:** `viewportWidth` is a client-side concern.
*   **SSR (Initial Guess):** For initial page load, a default density could be set on the server based on common device assumptions or user preferences, but this would be overridden by the client-side `applyDensity` call once the page loads.